# Getting started verification

## Result and decisions

Guest setup prepares a saved travel profile and complete ID; hotel setup prepares
property information, active rooms and rates. Both clients now provide optional
Getting started guides, live next actions, progress and explanatory disclosures.
There are no automatic redirects or forced slides during login or QR check-in.

Readiness comes from existing server profile/details/room responses. A click never
completes a task, and unset rates remain incomplete while zero rates are valid.
Permissions determine available hotel tasks; reception cannot use owner setup.
Expired subscriptions retain readable guidance but no setup write action/prompt.
No API contract, server implementation or migration changed, preserving installed
native API compatibility.

Dismissal is deliberately device-only, keyed by Clerk account, personal/property
scope and guide version. It stores no identity data. Completion follows actual
saved data across devices; Help can replay any permitted guide after dismissal.
The cost is that dismissing on one device does not dismiss on another. The guide
starts after hotel registration/approval provisions a property; it does not add a
new self-service property-creation workflow.

## Passing automated verification

- `pnpm --filter @tattvix/api check-types` and `test`: 104 tests passed.
- `pnpm --filter web check-types`, `test` and `build`: 91 tests passed.
- `pnpm --filter native check-types` and `test`: 46 tests passed.
- `git diff --check` passed.

New regression coverage includes guest profile versus ID readiness, progress
regression when data is removed, inactive/no rooms, null/zero rates, missing
property fields, partial/no management permissions, account/property storage-key
isolation, unavailable web storage, prompt visibility and native action/deep-link
resolution. Total executed package tests: 241. Existing large-chunk and development
Clerk warnings remain; they are not introduced behavior failures.

An independent review found missing native resume links and deep-link mapping;
both were fixed. Integration/re-review also corrected scoped web dismissal,
narrow task rows, link-button semantics, cached-error rendering, a native refresh
identifier typo and room-query requirements for property-only permission. Final
scoped review and native typecheck passed without a remaining functional blocker.

## Actual local UI checks

Used the signed-in development test account on localhost web and a local arm64
Android emulator, against local PostgreSQL and object storage.

| Scenario | Observed result |
| --- | --- |
| Guest preparation | Web guide began at 0/2; following its CTA and saving the profile changed it to 1/2 and made ID the next action. Android refresh showed the same saved progress. |
| ID preparation | The web ID action opened `#identity-documents`. Saved a synthetic passport draft, expiry and photo through the existing document/upload UI. The photo was the app logo, not a real ID. Both clients then showed 2/2 and the completed arrival guidance. |
| Completed guest | Return-to-travels action worked; guest-home setup prompt was hidden. |
| Hotel setup | Saved City address/contact/arrival times on web; guide advanced to 1/3. Added room 101 without a rate; guide advanced to 2/3. Saved a zero rate in Android's room editor; both clients showed 3/3. |
| Completed hotel | Web Go to Today action worked and setup prompt disappeared; native showed completed guide and its Today action. |
| Dismiss/replay | Dismissed Lakeside prompt on web, reloaded and confirmed absence. Personal prompt remained independent. Help reopened Lakeside guide at 0/3. Android dismissal and Help replay also worked. |
| Reception | Direct guide links on both clients displayed role explanations instead of owner setup actions. |
| Expired subscription | Both clients displayed read-only guidance; no property/room setup action was available. |
| Deep links | Android hotel guide URL opened the correct property guide; personal app-scheme link opened guest guidance. |
| Narrow layout | Web hotel guide checked at 390x844 override: document client/scroll widths both 375 (scrollbar occupies the balance), no horizontal overflow. Override reset. Native task copy wraps fully. |

The time controls in the browser required real arrow-key input after automated
fill to commit their controlled values; the final saved values were confirmed by
the resulting progress. Development hot reload briefly encountered intermediate
code errors during implementation; final native launch, guides and forms worked.

## Local fixture residue

No production data, remote permissions or credentials were changed. The following
development fixtures remain for reproducing this verification:

- Existing `tattwix.test+clerk_test@example.com` now has an explicitly synthetic
  Onboarding Tester profile and `TESTONLY12345` document with the logo image in
  local object storage, expiry 2030-01-01. This is prepared test material, not
  verified identity or a real government document.
- Existing `team-e2e-20261026/city`: address/contact/14:00 and 11:00 arrival times,
  room 101 (Double, floor 1), zero nightly rate.
- `onboarding-reception-20261026/desk`: local reception-only test membership for
  the existing tester, with existing user 30 as owner and an active trial.
- Existing expired `team-e2e-empty-20261026` now has `onboarding-expired` property.
- Lakeside prompt dismissal is retained on this browser/emulator.

## File map and review order

1. Shared behavior: start with `packages/api/src/onboarding.ts` and its tests.
   These define task completion, copy, actions and storage keys for both clients.
2. Web: `apps/web/src/features/onboarding/components/` handles query orchestration,
   guide/prompt rendering; `storage.ts` handles optional dismissal. Guest/property
   routes, Help and existing profile/details/rooms screens supply entry/resume paths.
3. Native: read `apps/native/src/components/onboarding.tsx` next; guide routes
   handle focus refresh and permission/entitlement states. `src/lib/onboarding*`
   handles local dismissal/action resolution. `app-links.ts` maps guide links.
   `ListRow` adds optional untruncated text while preserving its existing defaults.

## Release and verification limits

This was a local web + Android development-client check, not an iOS/physical-phone
or production release check. Network-loss UI, blocked native SecureStore and
live role-revocation during a guide were not manually induced; relevant guards
were reviewed and storage failure behavior is covered on web. Native guide/action
changes are JavaScript-only; no OTA or store update was published. The separate
launcher-icon update still requires a new native binary.

## 2026-10-27 follow-up: explicit skip

Incomplete guides now show **Skip for now** on web and native, alongside a note
that setup is optional. Loading/error states also retain an exit, independent of
readiness. Guest copy clarifies that scanning starts a real hotel check-in.
Skipping navigates to the guest home or property Today without marking tasks
complete or changing saved progress.

Verified skip with a 1/2 guest profile and a 0/3 property on both localhost web
and the Android emulator. The temporary guest city-field change used to exercise
incomplete readiness was restored to Jaipur afterward. Required web types/tests/
build and native types/tests passed; the shared API suite passed (241 tests total).
Loading/error exits were inspected and typechecked, not manually network-fault
injected. No API/auth/consent contract changed, and no OTA/store release was made.
