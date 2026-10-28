# Hotel referrals verification

## Result and boundaries

Tracking-only referrals are available from owner Account settings on web and
native. Owners create one stable code, copy/share a registration link, and see
registration counts plus pending/approved/rejected hotel entries. Registration
accepts an optional code; attribution is fixed on the request when submitted.
No rewards, payment changes, click tracking or referral-edit endpoint exist.
See ADR 0007 for request-based counting and rejected/reapplied requests.

Migration 0019 was applied locally. It adds a code table and nullable protected
foreign key; existing request response shapes and no-code registration remain
compatible. Native registration continues through its existing web handoff.

## Verification actually run

- **704 passing tests:** server 371, contracts 88, shared API 105, web 94, native 46.
- Web check-types, including production build; native tsc --noEmit; Django check;
  migration drift and git diff whitespace checks passed. Existing web chunk-size
  warning remains.
- Backend tests cover owner/guest/anonymous access, owner role loss, inactive
  referrers, expired subscriptions, self/invalid codes, normalization, unchanged
  response shape, private field projection, request approval/rejection/reapplication,
  duplicate attribution, bounded cursor paging and rare random-code collision.
- Real PostgreSQL concurrent submissions with competing codes produced one pending
  request and one conflict; the winning attribution remained. Concurrent creation
  returned one stable code for the same owner account.
- Shared tests cover schema normalization/privacy, account/cursor cache keys,
  POST payload/invalidation and referral link construction. Web auth tests cover
  whitelisted registration/check-in return URLs and rejected external destinations.
- **15 real authenticated HTTP checks** against local Django/PostgreSQL: code
  creation/reuse, referred web submission tracking, self/unknown rejection, approval,
  second referred submission, duplicate conflict, rejection, scoped counts,
  private reason exclusion, recipient/anonymous tracking denial.
- Browser: created code, copied link with success feedback; visited the sign-in
  route with a registration return URL while already authenticated; verified the
  code survived and prefilled the form; submitted a synthetic hotel registration;
  saw Pending; later verified the owner tracker updated to Rejected for a separate
  referred request. Native/browser used the same stable owner code.
- Android emulator: Account → Referrals, code/link display, empty tracker, refresh
  to pending registration, native share sheet with exact URL/code, cancel without
  sending a message, then refresh to Rejected with updated counts/review timestamp.
  Screenshots inspected for layout and wrapping.
- Independent static review reported no actionable findings. This was not a second
  execution of tests. A real Google OAuth round trip, fresh-account signup, iOS,
  physical phones and production deployment were not exercised.

## Review map

Read `apps/server/api/referrals.py` first for permission/attribution/count rules,
then `packages/api/src/referrals.ts` for client boundaries and owner-scoped caches.

- Data/server: models, migration 0019, referrals.py/referral_views.py,
  hotel_registration.py/serializers, URLs, tests/test_referrals_api.py.
- Shared: contracts referrals.ts and registration input; API referrals.ts;
  regression tests and package exports.
- Web: Referrals page/route, settings entry, optional registration field/search,
  login/signup transitions, SSO callback destination helper and tests.
- Native: guest-stack referrals.tsx screen, Account settings entry, API factory
  and stack registration. Sharing uses React Native's built-in Share API.

## Local test residue

Two clearly named Referral QA registration requests remain: one approved web
request and one rejected request. Approval created its synthetic organization,
property and owner membership through the normal local workflow. Two development
owner accounts now have referral codes. Routine Clerk development sign-in sessions
were created for authenticated tests; no credentials were changed. No contacts
were messaged, production data changed or native update published. Unrelated
untracked .claude/ files were preserved.
