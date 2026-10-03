# Stay billing implementation

## Read first

1. `packages/contracts/src/billing.ts`: integer-paise request/response shapes, strict inputs, bounds, bill finality and guest-facing hotel details.
2. `apps/server/api/hotel_operations.py` and `apps/server/api/billing.py`: atomic room assignment/price snapshot, idempotent extras, audited voids and checkout serialization.
3. Guest stay pages and the staff bill panel: the public-facing flow and recovery states.

## Decisions and risks

Reception chooses the room and enters nights. Initial billing is the configured nightly rate multiplied by those nights, frozen at check-in. Room rate edits apply to future stays. INR is the pilot currency; no payment collection, tax calculation or tax-invoice generation is included. Checkout finalizes charges; corrections after checkout require a future adjustment workflow.

Permissions and ownership are enforced by the server: room rate changes require `rooms:manage`, hotel details require `hotel:manage`, charges require `stays:update`, and guest reads require stay ownership. Consent revocation and QR expiry do not remove access to the guest's own bill.

Pessimistic row locking serializes billing mutations and coherent bill reads with checkout. Request IDs make retrying an extra idempotent. A definite client rejection can be corrected; ambiguous network failures retain the request ID. Voids preserve original lines, actors, timestamps and reasons. The immutable room charge is not editable in this version.

Migration 0012 was applied to the local database. It creates billing schema and copies registration address/contact into existing properties. A code revert alone does not undo schema or copied/created data. No historical charges were invented. Production migration/deployment and push were not performed.

Active guest pages poll every five seconds. At greater scale, polling, per-stay rate aggregation in lists (N+1 queries), and locking very large bills need a revised read/subscription model.

## Verified

- Full PostgreSQL backend suite: 196 passing tests, including snapshot rollback, ownership/permissions, safe totals and actual lock-contention scenarios. One subsequently added focused returning-guest lifecycle test also passed.
- Contracts: 71 passing tests.
- Web regressions: four passing tests for exact paise input/display, operational status independent of consent, and scoped bill-cache invalidation.
- Workspace type checks passed; final web build/type checks passed after integration. Migration drift and whitespace checks passed.
- Playwright checked the actual signed-out QR page at desktop and 390px width, with no horizontal overflow or browser errors.

Authenticated browser submission/add/void/checkout was not manually exercised end to end in this turn; those paths were exercised through PostgreSQL API/service tests. Historical registration backfill was not separately exercised against a populated pre-0012 schema. Existing Vite bundle-size and Clerk development warnings remain.

## File map by layer

### Contract

- `packages/contracts/src/billing.ts`
- `packages/contracts/src/check-in.ts`
- `packages/contracts/src/hotel-operations.ts`
- `packages/contracts/src/index.ts`

### Data and server

- `apps/server/api/billing.py`
- `apps/server/api/billing_serializers.py`
- `apps/server/api/billing_views.py`
- `apps/server/api/migrations/0012_stay_billing_and_property_details.py`
- `apps/server/api/property_details.py`
- `apps/server/api/check_in.py`
- `apps/server/api/hotel_operation_views.py`
- `apps/server/api/hotel_operations.py`
- `apps/server/api/hotel_registration.py`
- `apps/server/api/management/commands/seed_dev.py`
- `apps/server/api/models.py`
- `apps/server/api/serializers.py`
- `apps/server/api/urls.py`

### Client

- `apps/web/src/features/check-in/components/hotel-arrival-summary.tsx`
- `apps/web/src/features/guest-stays/api.ts`
- `apps/web/src/features/guest-stays/components/guest-stay-detail-page.tsx`
- `apps/web/src/features/guest-stays/components/guest-stays-page.tsx`
- `apps/web/src/features/guest-stays/queries.ts`
- `apps/web/src/features/guest-stays/status.ts`
- `apps/web/src/features/hotel-details/api.ts`
- `apps/web/src/features/hotel-details/components/hotel-details-page.tsx`
- `apps/web/src/features/hotel-details/keys.ts`
- `apps/web/src/features/hotel-details/mutations.ts`
- `apps/web/src/features/hotel-details/queries.ts`
- `apps/web/src/features/hotel-operations/invalidation.ts`
- `apps/web/src/features/hotel-stays/components/stay-bill-panel.tsx`
- `apps/web/src/lib/money.ts`
- `apps/web/src/routes/_auth/_hotel/hotel/$organizationSlug/$propertySlug/details.tsx`
- `apps/web/src/routes/_auth/stays/$stayId.tsx`
- `apps/web/src/routes/_auth/stays/index.tsx`
- `apps/web/src/components/app-shell.tsx`
- `apps/web/src/features/check-in/components/check-in-page.tsx`
- `apps/web/src/features/check-in/mutations.ts`
- `apps/web/src/features/hotel-operations/api.ts`
- `apps/web/src/features/hotel-operations/components/hotel-rooms-page.tsx`
- `apps/web/src/features/hotel-operations/mutations.ts`
- `apps/web/src/features/hotel-stays/api.ts`
- `apps/web/src/features/hotel-stays/components/hotel-stay-detail-page.tsx`
- `apps/web/src/features/hotel-stays/keys.ts`
- `apps/web/src/features/hotel-stays/mutations.ts`
- `apps/web/src/features/hotel-stays/queries.ts`
- `apps/web/src/routes/_auth/_hotel/hotel/$organizationSlug/$propertySlug/stays/$stayId.tsx`
- `apps/web/src/routes/_auth/guest.tsx`

### Tests

- `apps/server/api/tests/test_billing_api.py`
- `apps/server/api/tests/test_billing_concurrency.py`
- `apps/web/src/features/guest-stays/status.test.ts`
- `apps/web/src/features/hotel-operations/invalidation.test.ts`
- `apps/web/src/lib/money.test.ts`
- `packages/contracts/src/billing.test.ts`
- `apps/server/api/tests/test_full_lifecycle_smoke.py`
- `apps/server/api/tests/test_hotel_operations_api.py`

### Product documentation

- `docs/tattvix-platform-overview.md`
- `plans/001-tattvix-web-mvp-roadmap.md`

This document records architecture, verification and the task file map.
