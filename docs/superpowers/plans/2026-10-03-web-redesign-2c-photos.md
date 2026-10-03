# Web Redesign — Plan 2c: Property & Room-Type Photos (+ polish)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let owners/managers upload a property cover photo and one photo per room type, and show them where A3.1 expects imagery: sidebar switcher, Overview rows, Rooms table, Stay detail. Plus three small polish fixes.

**Architecture:** A new `PropertyPhoto` model (one row per property × kind × room type) using the **same pending → finalize presigned-upload pattern as identity document images** (`apps/server/api/identity_documents.py`: `create_pending_upload`, `finalize_pending_upload`, `_validate_uploaded_object`). The server generates every object key under `properties/{property.id}/photos/…`, stores it as *pending*, and on finalize checks the stored object's real content type and size against the pending values before promoting it; the previous object is deleted. Reads return short-lived presigned GET URLs (`PrivateObjectStorage.create_download_url`). Photos are **not** identity data, but they live in the same private bucket.

**Tech Stack:** Django/DRF, boto3-backed `PrivateObjectStorage` (MinIO locally), zod, React/TanStack Query; client compression via existing `features/identity-documents/compress-image.ts`.

**Spec:** `docs/superpowers/specs/2026-10-03-web-visual-redesign-design.md` §7 row "Room-type photos, property cover". Reference look: `docs/design/reference/a3.1-prototype.html` (sidebar banner, row thumbnails, stay room card).

## Global Constraints

- **This plan adds a migration** (danger domain). Generate it with `makemigrations`; do not hand-edit other migrations. Zero users — no data backfill needed.
- Upload/remove requires `hotel:manage`; viewing requires `hotel:view`. Unauthorised → 404 (via `get_accessible_property`).
- Allowed types/size come from `PrivateObjectStorage._validate_upload` (reuse; don't duplicate limits). Room type is matched by exact string against existing `Room.room_type` values of that property; reject unknown room types (400).
- Never trust a client-sent object key: finalize reads the **pending key from the DB row**, not from the request.
- No photo → render nothing (no placeholder boxes), except the switcher keeps its initials tile.
- Web: tokens only, light only; thumbnails `rounded-md object-cover`.
- **Never commit.** Leave changes unstaged.

## Commands
Server tests: `cd apps/server && .venv/bin/python manage.py test api.tests.<module>` (may be unreachable in a sandbox — write tests anyway and say so). `makemigrations`: `cd apps/server && .venv/bin/python manage.py makemigrations api` (needs only settings, not the DB; if it fails for DB reasons, report). Contracts/web commands as in previous plans. No pnpm/npm/npx/uv.

## Review Focus
1. **Finalize ignores any client-supplied key** — a staff member cannot attach an arbitrary bucket object. Test `test_finalize_uses_pending_key_only`.
2. **Uploaded object whose real size/type differs from the pending declaration is rejected** and the pending key cleared. Test `test_finalize_rejects_mismatched_object`.
3. **Reception (no `hotel:manage`) can view photos but not upload** — 404 on upload. Test.
4. **Replacing a photo deletes the previous object** — test with a storage double.
5. **Unknown room type → 400.** Test.

---

### Task 1: Model + migration + domain functions (server)

**Files:** `apps/server/api/models.py` (add `PropertyPhoto`), new migration, new `apps/server/api/property_photos.py`, new `apps/server/api/tests/test_property_photos_api.py` (Task 2 adds API tests).

- [ ] **Step 1: Model**
```python
class PropertyPhoto(models.Model):
    class Kind(models.TextChoices):
        COVER = "COVER", "Cover"
        ROOM_TYPE = "ROOM_TYPE", "Room type"

    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="photos")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    room_type = models.CharField(max_length=100, blank=True, default="")  # "" for COVER
    object_key = models.CharField(max_length=512, blank=True, default="")
    pending_object_key = models.CharField(max_length=512, blank=True, default="")
    pending_content_type = models.CharField(max_length=100, blank=True, default="")
    pending_content_length = models.PositiveIntegerField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["property", "kind", "room_type"], name="unique_property_photo_slot"),
        ]
```
Run `makemigrations api`; inspect the generated file (one `CreateModel`, one constraint).

- [ ] **Step 2: Domain functions** in `property_photos.py`, mirroring `identity_documents.py`:
  - `create_pending_photo_upload(*, property_, kind, room_type, content_type, content_length, storage) -> PresignedUpload` — validates `room_type` (COVER → must be ""; ROOM_TYPE → must exist in `Room.objects.filter(property=property_).values_list("room_type")`, else raise a 400-mapped error), builds key `properties/{property_.id}/photos/{kind.lower()}/{uuid4().hex}.{ext}` (reuse `CONTENT_TYPE_EXTENSIONS` from `identity_documents.py`), `storage.create_upload_url(...)`, `select_for_update().get_or_create` the slot and set pending fields; delete a replaced pending object (reuse the `_delete_without_interrupting` helper pattern).
  - `finalize_photo_upload(*, property_, kind, room_type, storage) -> PropertyPhoto` — lock the slot; require a pending key; `storage.get_object_metadata(object_key=pending)`; require exact match on content type and length (else delete the object, clear pending, raise); promote `object_key = pending`, clear pending, save; delete the previous `object_key` if any.
  - `remove_photo(*, property_, kind, room_type, storage)` — delete object, delete row.
  - `build_photo_payload(*, property_, storage) -> dict` — `{ "cover": {"url": ...} | None, "roomTypes": [{"roomType": str, "url": str}] }` for rows with a non-empty `object_key`, sorted by room type.

- [ ] **Step 3:** Model/migration import check: `.venv/bin/python manage.py check`. **Stop.**

### Task 2: API (server, test-first)

**Files:** `apps/server/api/property_photo_views.py` (new), `apps/server/api/urls.py`, `apps/server/api/tests/test_property_photos_api.py`.

Routes (names in parentheses):
- `GET  api/hotel/<org>/<prop>/photos/` → `build_photo_payload` (`hotel-property-photos`) — `hotel:view`
- `POST api/hotel/<org>/<prop>/photos/upload/` body `{kind, roomType?, contentType, contentLength}` → `{upload: {url, method, headers, expiresInSeconds}}` (`hotel-property-photo-upload`) — `hotel:manage`
- `POST api/hotel/<org>/<prop>/photos/upload/complete/` body `{kind, roomType?}` → photo payload (`hotel-property-photo-upload-complete`) — `hotel:manage`
- `DELETE api/hotel/<org>/<prop>/photos/` body `{kind, roomType?}` → photo payload — `hotel:manage`

Use a DRF serializer for the bodies (`kind` choice, `roomType` max 100, `contentType` str, `contentLength` positive int). Apply the same throttle class used by identity uploads if one is reusable (see `identity_document_views.py`).

- [ ] **Step 1: Tests first** (model setUp on `test_hotel_reports_api.py` / identity upload tests; use the storage test double those tests use — read `test_identity_document_api.py` for how storage is faked):
  - `test_owner_uploads_and_finalizes_cover` → GET returns a cover URL.
  - `test_finalize_uses_pending_key_only` — POST complete with an extra `objectKey` field pointing elsewhere is ignored (serializer drops unknown fields); the promoted key starts with `properties/{id}/photos/cover/`.
  - `test_finalize_rejects_mismatched_object` — storage double reports a different length → 400, pending cleared, object deleted.
  - `test_replacing_photo_deletes_previous_object`.
  - `test_unknown_room_type_is_400`.
  - `test_reception_can_view_but_not_upload` — GET 200, POST upload 404.
  - `test_other_property_is_404`.
- [ ] **Step 2: Run — FAIL. Step 3: implement views + routes. Step 4: Run — PASS**, plus `test_identity_document_api`, `test_object_storage`. **Stop.**

### Task 3: Contracts + web data layer

**Files:** `packages/contracts/src/hotel-operations.ts` (+ index export, + test); `apps/web/src/features/property-photos/{api,keys,queries,mutations}.ts`.

- [ ] Schemas: `propertyPhotoKindSchema = z.enum(["COVER","ROOM_TYPE"])`; `propertyPhotosResponseSchema = z.object({ cover: z.object({ url: z.string().url() }).nullable(), roomTypes: z.array(z.object({ roomType: z.string(), url: z.string().url() })) })`; upload request/response schemas matching Task 2.
- [ ] Query `propertyPhotoQueries.list(org, prop)` with `staleTime: 5 * 60_000` (presigned URLs expire — keep staleTime below the storage TTL; read `presigned_url_ttl_seconds` default in `object_storage.py`/settings and use ≤ half of it).
- [ ] Mutation `uploadPropertyPhoto` = request upload → compress with `compress-image.ts` (max long edge 1600px) → `fetch(upload.url, { method, headers, body })` → complete → invalidate `propertyPhotoQueries.list`. Mirror the identity document upload client flow (`features/identity-documents`) for error handling.
- [ ] Helper `getRoomTypePhotoUrl(photos, roomType)`.
- [ ] Contracts tests + web types pass. **Stop.**

### Task 4: Web UI

- [ ] **Property settings** (`features/hotel-details/components/hotel-details-page.tsx`): new `Panel` "Photos": cover slot (16:7 preview or dashed `rounded-lg border-dashed` dropzone "Add cover photo") + a grid of room-type slots (one per distinct room type from `hotelOperationsQueries.rooms`), each with preview/replace/remove. Only rendered when the member has `hotel:manage` (permission is available from the route context the page already uses — follow how other pages gate actions).
- [ ] **Sidebar switcher** (`components/app-shell.tsx` `WorkspaceSwitcher`): when the active property has a cover, render it as the `SwitcherTile` (`size-8 rounded-md object-cover`) instead of initials; and in the expanded sidebar, a 56px-tall banner above the name (as in the reference). Query only when a property is active.
- [ ] **Overview** (`hotel-overview-page.tsx`): 32px room-type thumbnail in In-house rows (Room/Type cell) and Leaving-today rows, when a photo exists.
- [ ] **Rooms page**: thumbnail in the Type column.
- [ ] **Stay detail**: when the stay's room type has a photo, a room card at the top of the main column: photo `aspect-[16/7] rounded-lg object-cover` + one 13px line `{roomType} · Floor {floor} · ₹{rate}/night` (rate from the rooms query; omit any part that is missing). Bed type and room size are not in the data model — do not invent them. No card when no photo.
- [ ] **Polish:** (a) Rooms page — remove the explanatory status sublines ("Released automatically at checkout"), keep only the `StatusPill`; move per-row rate editing behind a row action button that reveals the input inline (one row editable at a time). (b) Stays list and guest rows — hide "0 companions" (show "+N" only when N > 0). (c) Nothing else.
- [ ] Web tests + types pass. **Stop — leave unstaged.**
