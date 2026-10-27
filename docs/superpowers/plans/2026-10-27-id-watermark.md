# ID watermark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Every newly issued hotel image URL exposes a watermarked shared copy.
**Architecture:** Bounded server rendering, versioned object metadata, existing
snapshot key lifecycle and unchanged signed-URL DTO, used by web and native.
**Spec:** `docs/superpowers/specs/2026-10-27-id-watermark.md`.

## Global constraints and review focus

- Preserve originals, consent/expiry/scope, installed-client compatibility.
- No raw fallback on decode/storage failure; private no-store files.
- Serialize legacy conversion with revocation and purge; don't resurrect purged keys.
- Handle front/back/companions, retries, bounded images and immutable share dates.

### Task 1: Renderer and storage (independent worker)

Own `apps/server/api/image_watermark.py`, its tests, font assets/licenses,
`api/object_storage.py`, `tests/test_object_storage.py`, `pyproject.toml` and uv lock.

- [x] Write failing tests; add Pillow and a licensed bundled font.
- [x] Implement `watermark_identity_image(data: bytes, *, property_name: str,
  shared_at: datetime) -> bytes` (JPEG), raising `WatermarkError` for invalid input.
- [x] Add `PrivateObjectStorage.read_image_bytes(*, object_key: str) -> bytes` and
  `put_image_bytes(*, object_key: str, data: bytes, metadata: dict[str,str]) -> None`.
  Validate keys/size/type, bounded read and close, JPEG private/no-store writes.
- [x] Extend `ObjectMetadata` with `metadata: dict[str,str]` default empty.
- [x] Run focused tests/types and report actual limits/font coverage.

### Task 2: Lifecycle and endpoint integration (primary agent)

Own check-in services/views, watermark orchestration module and integration tests.

- [x] Add failing integration tests for new/legacy copies and fail-closed access.
- [x] Prepare new copies through renderer before snapshot transaction; cleanup
  including the current destination if a put request ambiguously fails.
- [x] Legacy access checks watermark metadata under stay/image lock, converts
  once in place, rechecks expiry and signs existing DTO only after success.
- [x] Purge uses matching stay/image lock order and repeats expiry eligibility.
- [x] Cover retry cleanup, companions, authorization, expiry and concurrency.

### Task 3: Clients (independent worker)

Own minimal shared copy/helper if needed plus hotel ID UI on both clients.

- [x] Read design system; explain burned-in watermark near hotel ID images/print.
- [x] Preserve API URL usage, original guest view, retries and print safeguards.
- [x] Run web types/tests/build and native types/tests. No emulator/browser use.

### Task 4: Integration and delivery (primary)

- [x] Review renderer/lifecycle/clients; run all required checks.
- [x] Real local check-in with synthetic front/back/companion ID, web + Android
  image rendering, shared byte download, legacy conversion and original hashes.
- [x] Save evidence/limitations, scoped commit, push main. No production data writes
  or OTA/store deployment authorized by this task.

Verification detail and print-dialog limitation: `docs/verification/2026-10-27-id-watermark.md`. Migration0017 was added for durable failed-preparation cleanup after review.
