# ID access lifecycle verification

Hotel ID access now lasts throughout the pending/in-house stay and expires exactly
60 days after operational checkout. The checkout timestamp is authoritative;
legacy submission deadlines and early identity-review closure cannot shorten it.
Existing revoked stays stay revoked. Checkout retries preserve the first deadline.
Guest revocation and legacy identity-close requests before checkout return 409;
guests can revoke after checkout. Purge selects and rechecks the same lifecycle
under the stay lock, preserving active-stay copies. Consent is versioned 2026-10-27.

No schema migration or backfill is required. Nullable expiry DTOs remain unchanged;
active stays return null until checkout. Old configuration names are retired in
favor of HOTEL_IDENTITY_POST_CHECKOUT_ACCESS_DAYS=60. Reads derive expiry for
existing retained copies from checkout; previously deleted copies are not restored.
Changing the setting affects existing retained copies too. Uncompleted pending
intake does not expire without an explicit future cancellation/no-show lifecycle.
Scheduled deletion can run after access ends, and existing signed URLs keep their
short TTL. Guest originals, immutable snapshots and audits remain separate.

## Passing verification

- Server: 343 tests, including long stays, legacy deadlines, exact boundary,
  repeated checkout, preserved revocation, primary/companion access and purge.
- PostgreSQL concurrency: image conversion versus expiry/purge and revocation
  waiting behind checkout. The latter first exposed a timestamp captured before
  lock acquisition; capturing it after the lock fixed it. Both race tests pass.
- Shared API: 99 tests; contracts: 84; web: 92; native: 46 (664 total).
- Web check-types, including production build, and native tsc --noEmit passed.
  Django checks and migration drift check passed. Existing bundle-size warning
  remains. No production or iOS/physical-phone check ran.
- 24 real authenticated HTTP checks against local Django/PostgreSQL/MinIO:
  new sharing without a running expiry, check-in, simulated 120-day stay with
  working watermarked downloads, denied early revoke/close, checkout +60 days,
  repeat checkout, day-59 access and image URLs, day-60 hidden snapshot and denied
  image URL, plus UI revocation and checkout retry preserving revoked state.
- Local browser displayed active guest sharing with no revoke action, the
  post-checkout December 26 expiry for October 27 checkout, and a revoke control
  only on the checked-out card. Confirming it updated the UI and denied hotel
  access immediately. Native emulator displayed active and checked-out hotel ID
  panels, including the correct 60-day expiry. Native guest My stays displayed
  the same in-stay explanation and no stop-sharing action. The dev client was
  relaunched against Metro 8090 to clear an unrelated stale navigation stack.

## Files and delivery

Read server api/check_in.py first (effective deadline, access, cleanup), then
api/hotel_operations.py (checkout persistence), and packages/api/src/guest-access.ts
(shared guest decisions/copy). Both consent components and hotel stay screens
consume the rule; docs/adr/0005-identity-access-follows-checkout.md records the
contract and limits. The dev seed now ages checkout for expired fixtures rather
than setting an obsolete submission deadline.

The installed-native response shape remains compatible, but older guest screens
interpret null expiry as ended and retain old wording. The matching native JS
changes need normal OTA delivery; no OTA/store release was published by this task.
No manual production data or credential changes were made.

Local residue: two synthetic stays and one QA room at
team-e2e-20261026/watermark-qa. The active stay is
fc883543-50b4-4f12-b85e-c6901d3f24d4. The checked-out stay
fdbb1ff9-54d4-4151-adab-2992b7b0ba0a was revoked from web Privacy after expiry
screenshots were captured. Simulated historical dates were restored; the local
private shared copies and synthetic bills remain. No real guest IDs were used.
Task screenshot artifacts use the prefix access-web- / access-android-.
