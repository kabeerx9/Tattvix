# Hotel-shared ID watermarks

Approved scope: hotel-visible copies carry the property name, “For hotel check-in
only”, and the sharing date burned into the image. Guest originals stay intact.
Both sides and companions are included; viewing, saving and web printing use the
same bytes. Watermarks discourage reuse, not guarantee tamper prevention or ID
verification. User authorized implementation, local end-to-end QA and push to main.

## Architecture and rulings

- Pure bounded Pillow renderer produces orientation-correct JPEG with repeated
  restrained text and a legible footer. Bundle a licensed font in the repository;
  do not rely on fonts installed on the server. Strip source metadata, composite
  transparency over white, reject corrupt/unsupported/unsafe images. Keep ID
  content readable and handle long names. Date is sharing date, labelled UTC.
- New check-in submissions render from original uploads into isolated snapshot
  keys. Share timestamp is captured before preparation and used for consent too.
  Each failed/retried/duplicate submission cleans up its own prepared objects.
- S3 metadata `tattwix-watermark-version=1` marks server-rendered shared copies.
  Newly created copies always render originals, never trust original-upload
  metadata to bypass rendering. The existing private snapshot key remains the
  authority. The URL DTO stays unchanged. A small pending-cleanup table tracks uncommitted keys for reliable recovery.
- On hotel image access, authorize property + consent, lock the stay and image,
  inspect snapshot-object metadata and convert legacy copies in place once.
  Original guest-upload keys are never overwritten. Recheck time-based access
  before signing. Failure yields 503; it never signs a raw image URL. Existing
  old-format raw copies have no server watermark metadata.
- For existing shares, use consent's sharing timestamp (snapshot timestamp only
  as a legacy fallback). Historical property name was not stored, so first-time
  conversion uses its current name; the resulting bytes retain that label after
  future property renames. New copies capture the name when shared.
- Convert in place to avoid extra orphaned legacy/raw objects and keep retention
  mapped to one key per shared image. Serialize conversion with revocation/purge
  in consistent stay-then-image lock order. Storage metadata makes retries safe
  after a database rollback following a successful object write.
- Tradeoff: each image-access issuance adds a metadata HEAD request. Rendering
  happens once per copy/version; image processing holds that stay's lock briefly.
  Bounded byte/pixel limits and storage timeouts constrain work. Already issued
  URLs expire under existing TTL; already downloaded files cannot be recalled.
- Both clients explain the watermark near hotel document images and use existing
  error/retry/print behavior. No UI-only overlay, original fallback or permissions
  expansion. No new identity information in logs.

## Verification

Test actual output bytes/format, visible watermark/footer, EXIF, alpha, supported
formats, long/non-Latin names, corrupted/oversized/decompression-bomb input,
metadata and bounded I/O. Test new submissions (front/back/companions), failures
and duplicate cleanup, old-copy conversion/retry, denied/expired/revoked access,
authorization after processing, and purge/conversion serialization. Run required
server/shared/web/native checks. Use synthetic material in local DB/object storage
and real authenticated web + Android flows. Compare guest original hashes,
downloaded shared bytes and printing; record unrun release scenarios explicitly.

## Review rulings

- Added PendingIdentityImageCleanup and migration0017 after review identified that best-effort deletion alone could retain untracked failed preparations. Markers are committed before PUT and cleared atomically with the snapshot. Failed deletes stay tracked; abandoned markers become purge-eligible after one hour and are retried by the existing daily retention job.
- Renderer bounds: 8 MiB input/output storage, 16M pixels, 8192px per axis, 12:1 aspect ratio, fixed tile cap; tiny valid sources upscale to640px width for readable text. Footer is appended below the content instead of covering ID fields.
- Bundled Noto fonts cover Latin/Greek/Cyrillic, Arabic and common Indic scripts. Unsupported characters have visible U+ codepoint spelling, preserving identity without blocking sharing or rendering missing glyphs.
