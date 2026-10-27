# ID access throughout stay and 60 days after checkout

User-approved rule: hotel access remains active through the stay; checkout starts
a 60-day access window. Guest revocation remains available after checkout. Push main.

- Use operational checkout timestamp as authority; old submission deadlines and
  premature identity-review closure cannot expire an active stay.
- Keep existing nullable expiry DTOs. Active stays return null (clock not started).
  Checked-out expiry derives from checkout + server-configured 60 days. Preserve
  revoked state. New checkout persists the derived deadline and stays idempotent.
- Reject early guest revocation and legacy identity-close actions before checkout.
  Keep actor/property scope checks and stay locks. Purge filters and lock rechecks
  use the same lifecycle, including legacy data; no migration/backfill required.
- Update shared client state/copy, consent notices and hotel ID panels in web and
  native. Test long stays, legacy deadlines, early/repeated actions, boundaries,
  purge and concurrency. Run server suite, both client checks and UI verification.
- Existing deleted copies are not restored. Installed native guests use old
  null-expiry interpretation until their JavaScript update is delivered; no
  required schema changes. Do not publish OTA without explicit authorization.
