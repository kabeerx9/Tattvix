# Team management verification — 26 October 2026

## Environment and boundaries

Local Django API `http://localhost:3000`, local Vite web `http://localhost:3001`, PostgreSQL `127.0.0.1:5442`, and the Tattwix Pixel 8 Android emulator running the current Metro bundle. Real Clerk **development** authentication was used, with existing reserved `+clerk_test` accounts. Web login used Clerk's test email-code flow. Android used a short-lived one-use development sign-in ticket for an existing test user; the normal password-entry flow was not tested because its existing password was unavailable. No passwords or production data were changed, and no new Clerk users were created.

Only `team-e2e-20261026` (two properties) and `team-e2e-empty-20261026` (zero properties, deliberately expired subscription) were used for team mutations. The temporary native login harness/ticket source was removed and the original landing route restored before final checks. Test accounts remain signed in locally for inspection. Local fixtures, audit rows, the audit-action choice migration and Clerk development test sessions remain; reverting code does not undo those test records. No native OTA or manual deployment was published.

## Automated checks actually run

| Check | Result |
|---|---|
| `pnpm --filter server test --noinput` | 303 passed, PostgreSQL; includes real threaded ownership and duplicate-add race tests |
| `pnpm --filter @tattvix/contracts test` | 83 passed |
| `pnpm --filter @tattvix/api test` | 98 passed |
| `pnpm --filter web test` | 89 passed |
| `pnpm --filter native test` | 42 passed |
| Web `check-types` and explicit `build` | Passed; existing chunk-size warning remains |
| Native, API and contracts `check-types` | Passed |
| Django system check and migration drift check | Passed; no ungenerated migrations |
| `git diff --check` | Passed |

## Authenticated local API checks

28/28 checks passed over HTTP against the running local API, using real short-lived Clerk development JWTs rather than DRF force-authentication. They covered anonymous/invalid-token rejection; owner authentication; authorized team read; reception access to its selected property and rejection from another property; guest/staff/foreign-user denial of team listing, search and grants; unknown and short email searches; duplicate-member conflict; foreign property and unknown selected-account rejection; new co-owner listing/promotion/deactivation/restoration of the original owner; revoked owner rejection; strict unknown-field and duplicate-property validation; expired zero-property organization reads (200), writes (402), and invalid empty staff selection (400).

## UI checks actually performed

| Case | Evidence |
|---|---|
| Web login | Existing development test email + test code completed real Clerk login |
| Owner account → Team | Followed actual account-setting links, including zero-property organization |
| Unknown user search | No-account guidance; no selectable identity |
| Explicit user selection | Selection remains after choosing a result; changing email disables Add |
| Missing staff scope | Add disabled until a property is selected |
| Web add/edit | Existing account added as Manager for Lakeside; changed to Reception with same scope |
| Duplicate add | Conflict displayed inside the open form; no duplicate membership |
| Last owner removal | 409 message displayed in the confirmation; owner retained |
| Web deactivate/restore | Member moved between active/inactive lists, preserving scope and membership |
| Android real session | Existing owner authenticated through Clerk development ticket, then original routes restored |
| Android add/edit | Added another existing account as Manager for City, then changed role and scope to Reception/Lakeside |
| Android deactivate/restore | Both actions completed through confirmation sheets and changed live roster |
| Android add Owner | Explicit full-access confirmation; member added with all-properties scope; confirmation closed after success |
| Cross-client persistence | Web reload showed Android changes; Android pull-to-refresh showed web deactivation |
| Self-demotion | Web confirmed Owner → Reception with City scope and redirected to settings without that organization's Team link |
| Other-device access loss | Android team refresh received rejection, refreshed `/me`, evicted inaccessible caches and rerouted to another accessible workspace |
| Co-owner authority | New co-owner's real authenticated HTTP session promoted, removed and restored the original owner; no founder hierarchy |
| Expired organization | Web and Android displayed read-only team records; mutation controls unavailable; web banner matched server expiration |
| Narrow web | Team list and add sheet checked at 390×844; document width 390, no horizontal overflow; viewport restored afterward |

Error/network/permission validation not listed as UI evidence above is covered by automated tests, not claimed as a manually clicked browser/emulator scenario. This was an Android emulator check, not a physical-phone or production-release check.

## Review fixes and decisions

An independent whole-change review identified five P2 findings. All were fixed in this pass: Owner-add confirmation cleanup; native stale-role overwrite during scope-only edits; inactive platform-organization mutation 500; incomplete inaccessible-cache eviction; and platform promotions retaining restricted owner scope. Each behavior received regression or authenticated UI evidence. Additional E2E findings fixed: web combobox selection clearing itself, and stale trial metadata beside an expired team page.

Decisions taken during implementation:

- Kept the repository's masked 404 for owner-team authorization failures; both clients treat 403/404 as a reason to refresh authority and clear team data. Cost: a missing resource can cause an extra account refresh.
- Retained legacy platform request adapters, sharing the organization lock and tested invariants with team services rather than replacing all old payload behavior. Platform admins retain prior inactive-organization behavior. Cost: future role-policy changes must keep both adapters covered by regression tests.
- Preserved historical restricted/all-properties scopes on status-only changes; a restricted legacy owner cannot grant or restore access beyond their own effective scope. New/promoted owners receive all-properties scope. Cost: legacy restricted owners may need a full owner/platform admin to perform broader grants.
- Used a one-use development sign-in ticket for Android instead of resetting a test user's unknown password. Cost: password-entry/device-trust behavior is outside this verification evidence.
- On loss of owner authority, clear operational query caches conservatively, including retained active screens. Cost: other still-authorized hotel views can require a fresh fetch.
- Implemented server and native portions in parallel with explicit file ownership and a fixed DTO, then used an independent final review. No deferred review findings remain.

## Compatibility and delivery

A real authenticated `/api/me/` response passed the pre-change strict schema from commit `4353f29`; existing platform regression tests passed. A previously installed release APK was not relaunched. Existing `/api/me/` and platform payload keys remain unchanged. New owner endpoints and UI are additive. The migration changes allowed audit-action choices and does not broaden existing memberships. Native changes are JavaScript-only and can be delivered by OTA once publishing is authorized. A Git push alone does not update installed phones.

## File map and review order

1. Server: start with `apps/server/api/team.py` (authority, locking, scope and last-owner rules), then `team_views.py`, `team_serializers.py`, and the platform adapters in `platform_admin.py`. The audit choice migration is `api/migrations/0016_alter_platformauditlog_action.py`.
2. Shared: read `packages/api/src/team.ts` next (transport, query factories, permission-cache eviction and form helpers), with DTO validation in `packages/contracts/src/team.ts`.
3. Clients: web `apps/web/src/features/team/components/team-page.tsx` and `team-member-form.tsx`; native `apps/native/app/(hotel-team)/[organizationSlug]/team.tsx` and `apps/native/src/components/team-member-form.tsx`. Account settings provide the entry links.
