# Hotel ID watermark verification

## Outcome and contract

Hotel-shared primary and companion ID images now contain the property name,
“For hotel check-in only”, and the consent sharing timestamp in UTC. Repeated
restrained text crosses the image; a full-name footer is appended below the
content so it does not cover ID fields. Guest-owned originals are not modified.
Web, native and downloaded files use the same server-rendered JPEG bytes.

The image-access DTO remains `{url, expiresInSeconds}`. Existing native builds
can display the watermarked bytes without a contract update. New client copy
explains the watermark; no CSS/native overlay or raw-image fallback is used.

New sharing renders isolated copies before consent/snapshot commit. Existing
shared copies are converted in place, under a stay/image lock, before issuing a
fresh URL. Object metadata records watermark version; a successful PUT remains
idempotent if the later DB transaction rolls back. Access/actor scope and expiry
are checked again after processing. Revocation and purge use the same lock order.

Migration `0017_pending_identity_image_cleanup` adds a small, indexed cleanup-key
table. A marker is committed before each prepared PUT, cleared with the snapshot
commit, or removed after successful deletion. Failed cleanup remains recoverable
through the existing retention command/cron. Abandoned preparations become
eligible after one hour; the existing daily cron determines retry timing. A
bounded portion of each purge batch is reserved for these records. The migration
was applied locally; no manual production migration was performed.

## Costs and limits

- Every fresh hotel image URL adds one object-metadata HEAD request. Conversion
  happens once per copy/version and holds that stay's lock during bounded I/O.
- Pillow 13.0.0 is locked. Rendering accepts single-frame JPEG/PNG/WebP, with
  8 MiB storage/input limits, 16M pixels, 8192px per axis and 12:1 aspect limit.
  Repeated tiles are capped independently. Tiny valid inputs upscale to 640px
  width; EXIF orientation is applied, transparency flattened, source metadata
  stripped. Invalid data fails closed.
- Bundled OFL Noto fonts add about 7.6 MiB. Latin/Greek/Cyrillic, Arabic and common
  Indic scripts render directly; other characters, including CJK and unsupported
  decorative symbols, use visible `U+XXXX` spelling. Full property names wrap in
  the footer; only the repeated background wording may shorten a long name.
- Historical shares did not store their original property name. First conversion
  uses the current name, then retains that burned-in label. Consent timestamp is
  authoritative, with snapshot timestamp only as a legacy fallback.
- Previously downloaded images cannot be recalled. Already-issued temporary URLs
  retain their existing TTL. The watermark identifies intended use; it does not
  certify identity or prevent editing/photography.

## Passing automated checks

| Layer | Commands/results |
| --- | --- |
| Server | Django test suite: **331 passed**; system check passed; migration drift check reported no changes |
| Shared API | **104 passed** |
| Contracts | **83 passed** |
| Web | check-types, **91 tests**, production build passed |
| Native | `tsc --noEmit`, **46 tests** passed |
| Hygiene | `git diff --check` passed |

Total: **655 passing automated tests**. Coverage includes actual rendered output,
orientation/transparency/formats, long and multilingual names, corrupt/animated/
oversized/skinny inputs, bounded stream reads/closing, new primary/back/companion
copies, expired/revoked/cross-property access, expiry and actor changes during
processing, ambiguous PUT cleanup and durable recovery. A real PostgreSQL threaded
test proves purge waits for conversion, then removes both copies after expiry
without an intervening signed URL or object resurrection.

Review identified oversized stamp-tile allocations and unrecoverable failed-copy
cleanup. Both were fixed; scoped re-review found no remaining functional/security
blocker. Existing old network mocks in seed/lifecycle tests were updated at the
rendering boundary; actual image processing is covered by renderer tests and the
real object-storage flow below.

## Local end-to-end evidence

Used local PostgreSQL/MinIO, existing development Clerk accounts, real JWT HTTP
requests, localhost web and the Android arm64 emulator. All ID material was
explicitly synthetic, marked “NOT VALID ID”. No real guest ID was used.

- **27 real HTTP checks** covered document creation, front/back uploads and
  finalization for a primary guest and companion, QR generation, consent/sharing,
  idempotent submission, four hotel URLs, unchanged response keys, original-file
  access, legacy conversion, repeat conversion, cross-property and anonymous denial.
- Downloaded all four shared files: JPEG, same content width, greater height for
  the appended footer, and different hashes from the originals. All four guest
  originals were downloaded again and remained **byte-for-byte identical**.
- Restored one private snapshot object to a raw PNG to simulate a legacy copy.
  Fresh hotel access converted it in place; repeat access returned identical bytes.
- Supplemental real HTTP checks denied expired and revoked access with 403. A
  real staged object/old marker was removed by the retention function with a
  one-item batch, with no unrelated objects processed.
- Web loaded all four 1000x736 watermarked images and showed the hotel-use note.
  The Print stay action opened its print document, whose accessibility tree
  included primary/back/companion images and the watermark note. After the Mac
  was unlocked, the browser's actual print-region DOM, loaded stylesheets and
  `STAY_PRINT_PAGE_STYLE` were captured. The four exact private snapshot objects
  were embedded into a standalone HTML artifact and rendered with isolated,
  sandboxed headless Chromium. Both A4 PDF pages were rendered through Poppler
  and visually inspected: all four complete ID images, repeated marks and full
  property/purpose/timestamp footers are visible without clipping. Extracting
  the PDF's four 1000x736 JPEGs confirmed byte-for-byte identity with the four
  stored watermarked copies. Existing waiting-for-room controls also appear in
  the print region; that pre-existing print layout was not changed.
  **The native macOS print dialog itself remains untested:** the computer-use
  tool prohibits control of Codex's native UI. This verifies the captured app
  print content/styles through Chromium PDF rendering, not OS-dialog automation
  or physical printing.
- Android displayed primary and companion front/back images, including the
  purpose/name/date footer. Local MinIO required `adb reverse tcp:9000 tcp:9000`;
  after forwarding storage, the actual images loaded. The development client was
  relaunched to refresh membership/property state for the new QA property.

Evidence images are in the task's local `watermarks` artifact folder: downloaded
`shared-*-*.jpg`, `source-synthetic.png`, `web-images.png`, `android-primary.png`,
and `android-companion.png`. Print evidence includes `stay-watermark-print.pdf`
and `print-page-1.png` / `print-page-2.png`; the standalone HTML embeds image bytes
so rendering does not require signed URLs. HTTP summaries contain test IDs/statuses,
not tokens.

## Local residue and delivery

The development DB retains the `team-e2e-20261026/watermark-qa` property (“Watermark
QA नमस्ते”), synthetic primary/companion documents and test stays from verification
runs, plus corresponding local private objects. One earlier QA stay is explicitly
revoked for denial testing. The latest happy-path stay is
`2dbda0ee-4fe4-4f27-a466-9db6444dcbbb`; no pending preparation markers remain.
Existing non-QA properties/accounts were not mutated, credentials were not changed,
and no real production identity data was accessed or written.

No OTA or store build was published. Pushing main may trigger the project's
configured deployment pipeline, which runs migration before serving the new code.
The API is compatible with installed native builds; the new explanatory native
copy still needs normal app-update delivery. No iOS/physical-phone or production
storage/deployment smoke check ran.

## Review map

1. Start with `apps/server/api/shared_identity_images.py` and the image-access
   function in `check_in_views.py`: processing boundary, metadata and authorization.
2. `check_in.py`, `models.py` and migration0017 cover commit/cleanup/retention;
   `image_watermark.py`, `object_storage.py` and licensed fonts cover bounded I/O
   and rendering. The watermark/concurrency/storage tests pin their failure modes.
3. Web `hotel-stay-detail-page.tsx` and native hotel `stays/[stayId].tsx` retain the
   existing image URL behavior and add hotel-use context for staff and print.
