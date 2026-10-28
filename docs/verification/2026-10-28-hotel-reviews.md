# Hotel reviews verification

## Behavior and boundaries

Each completed Stay has at most one immutable StayReview: integer 1–5 stars,
required trimmed written feedback (up to 2,000 characters) and submission time.
The authenticated primary guest can review only their own genuinely checked-out
visit. Each repeat visit can have a separate review. Guests see their review in
that visit's My stays details; there is no edit/delete action or endpoint.

New guest GET/POST endpoints leave existing stay DTOs unchanged. The server derives
author/property from the stay, locks it during submission and enforces one review
with a DB one-to-one constraint. Same-content retries return the first review;
different-content retries return 409 without changing it. Ratings have a DB range
check. Identity access and subscription entitlement do not gate review submission.

Property owners get Reviews navigation, a private list, total/average and links to
the existing guest stay. Existing owner-only hotel:manage permission is checked
with expired-subscription reads allowed. Managers, reception, other properties and
unrelated accounts cannot read this list. The review response excludes account
emails, reusable profile details, document metadata and private image keys. Guest
links retain the existing hotel stay/ID access checks, including revocation.

Migration 0018 creates the new empty table; it was applied locally. No historical
reviews are generated or stays backfilled. Reviews remain related to the stay
independently of ID cleanup; the new FK protects reviewed stays against deletion.
Owner pages fetch 26/return 25 using descending-ID cursors, with no deep OFFSET.
Count/average aggregate work still grows with the property's review volume.

## Actual verification

- **684 passing tests:** server 357, contracts 86, shared API 102, web 93, native 46.
- Web check-types (including production build), native tsc --noEmit, Django checks,
  migration drift and git diff whitespace checks passed. Existing web bundle-size
  warning remains. No production, iOS simulator or physical-phone check ran.
- New backend tests cover author/owner/property scope, actual checkout timestamps,
  revoked/expired identity, expired subscription reads, validation, DB constraints,
  immutability, repeat visits, cursor paging across intervening submissions, bounded
  queries and exclusion of identity-document columns from owner-list queries.
- PostgreSQL concurrency tests sent identical and different reviews simultaneously:
  exactly one record survived; the other response was respectively 200 or 409.
- **33 real authenticated HTTP checks** used local Django, PostgreSQL and MinIO:
  two synthetic completed visits, early-review denial, per-visit eligibility,
  another guest's denial, owner/property isolation, saved ratings, safe retry,
  refused edits/PATCH, two-review 4.5 average, and review survival after ID revoke.
- Browser: blank submission validation, 5-star text submission, read-only result
  surviving reload, owner navigation/list/average, and guest-stay link all verified.
- Android emulator: submitted a separate 4-star written review for the same guest's
  second visit; saved result was read-only. Switched to the property's owner Menu,
  opened Reviews, saw both visits and 4.5 average, and followed the revoked visit's
  guest link. The destination showed "The guest revoked identity access" and no ID.
- Native Menu testing found that many properties pushed its first rows off-screen.
  Bounded scrolling fixed the overflow. A downward scroll initially dismissed the
  sheet through its parent pan gesture; optional header-only drag handling now lets
  this Menu scroll both ways while retaining header dismissal. Existing sheets
  default to their former whole-sheet drag behavior. Both scroll directions and
  header dismissal were tested in the emulator after the fix.
- Independent review identified deep-offset paging and the nested gesture conflict;
  both were fixed and the focused re-reviews found no remaining actionable issue.

## Review map

Read `apps/server/api/reviews.py` first for ownership, immutable retry behavior and
cursor reads; then `packages/api/src/reviews.ts` for shared cache/error behavior.

- Data/API: `api/models.py` (StayReview), migration0018, `review_views.py`,
  `reviews.py`, URLs and `tests/test_reviews_api.py`.
- Shared: contracts `reviews.ts` and API `reviews.ts`, plus their regression tests.
- Web: `features/reviews/`, the guest stay-detail card, Reviews route, workspace
  navigation and shell icon mapping.
- Native: guest-review-section, guest stay detail, hotel Reviews screen and stack,
  API wiring, Menu and App Links. The Menu-specific BottomSheet option coordinates
  scrolling without changing other sheets' default gestures.
- Decision: `docs/adr/0006-reviews-belong-to-completed-visits.md`.

## Local residue and delivery

Local `team-e2e-20261026/review-qa` (Review QA) retains one QA room, two synthetic
completed stays, their existing synthetic ID copies/bills and two test reviews:
web visit `c810e2fd-f5df-48ab-a45d-08ddc3ba2e7b` (5 stars), native visit
`3b5a0439-5451-4f0b-b65d-f6ca99189e5b` (4 stars). The web visit's ID sharing was
revoked to verify the review stays available without reopening IDs. The room is
vacant. No real ID material or manual production data was used. Test authentication
used existing development accounts; no credentials or role grants were changed.

Screenshots in the task artifact folder: reviews-web-guest.png,
reviews-web-owner.png, reviews-android-guest.png and reviews-android-owner.png.
The native app is not live; this work does not publish an OTA or store release.
