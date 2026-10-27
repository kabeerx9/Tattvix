# Admin hotel contacts

The existing Hotels dashboard already supplies room totals/statuses, rate ranges,
occupancy, activity, subscription status, search and organization links. This
change adds each property's contact phone and all active organization owners
(name/email), on desktop and narrow-screen web rows. Search also matches those
contacts. Missing owner/phone values are explicit; managers and inactive owners
are excluded. No guest identity data is included.

`GET /api/platform/portfolio/?includeContacts=true` opts into the new optional
`contacts` object. Calls without the flag keep the exact previous response shape,
including calls from installed native clients with strict schema validation.
Platform-admin permission checks remain unchanged. Owner contacts use one batched
query, independent of property count. The existing portfolio still loads the full
portfolio; this change does not introduce pagination.

Review order: server `api/platform_portfolio.py` and its API tests, contracts
`src/platform.ts` and shared API `src/platform-portfolio.ts`, then web portfolio
`queries.ts`, `metrics.ts` and `components/portfolio-overview-page.tsx`.

Verification: 17 portfolio backend tests; 84 contracts, 105 shared API, 92 web and
46 native tests. Web check-types (which includes its production build) and native
`tsc --noEmit` passed. Regression tests first failed for absent contacts and owner
search. Tests cover opt-in compatibility, inactive/non-owner exclusion, multiple
owners, organization scope, admin denial, guest-data exclusion and constant query
count. Existing room/rate/occupancy tests remain passing. Build retains its chunk
size warning.

Local authenticated browser check at `/admin` displayed the contacts with existing
metrics; searching `+919999999999` returned only the synthetic Team E2E City hotel.
Screenshot: task artifact `admin-contacts.png`. No local DB writes were needed.
No native UI or emulator change applies: platform administration is web-only under
the project rules. Native shared-code types/tests passed; no OTA/store release was
made. Production was not smoke-tested.
