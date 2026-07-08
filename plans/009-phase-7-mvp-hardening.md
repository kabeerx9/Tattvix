# Plan 009: Harden the MVP for pilot hotel use

> **Executor instructions**: This phase makes the completed check-in/check-out flow reliable enough for pilots. Do not expand scope into post-MVP features.
>
> **Drift check (run first)**: `git diff --stat c0d5b98..HEAD -- apps/web apps/server packages/contracts plans`
> If the full MVP lifecycle, super admin dashboard, or reports are incomplete, stop and complete Plans 003 through 008 first.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: [plans/008-phase-6-mvp-reports.md](008-phase-6-mvp-reports.md)
- **Category**: direction
- **Planned at**: commit `c0d5b98`, 2026-07-08

## Why This Matters

The MVP handles sensitive identity information. Before pilot use, the workflow must be repeatable, auditable, and protected from obvious cross-tenant access, QR abuse, report leakage, and role mistakes.

## Phase Goal

Prepare the web MVP for a controlled hotel pilot without adding non-MVP product areas.

## Hardening Areas

- Tenant and property access checks.
- User type and role boundaries.
- Super admin access checks.
- QR token expiry, reuse, and abuse behavior.
- Audit log coverage.
- Room assignment edge cases.
- Report access boundaries.
- Error states and empty states.
- Search and filters for hotel submitted stays.
- Guest data minimization.
- Operational support through super admin and Django admin.
- End-to-end smoke coverage for the core flow.

## Backend Capabilities

- Permission tests for organization/property scoping.
- Permission tests for guest, hotel owner/staff, and super admin routes.
- QR endpoint abuse controls or rate-limit plan.
- Audit log admin visibility.
- Consistent error responses for invalid QR, missing profile data, invalid transitions, unavailable rooms, and unauthorized access.
- Smoke or integration tests for core lifecycle.

## Frontend Capabilities

- Hotel dashboard empty/loading/error states.
- Guest QR flow error states.
- Super admin empty/loading/error states.
- Report empty/loading/error states.
- Stay list search/filter.
- Responsive checks for mobile guest flow and tablet hotel dashboard.
- Clear recovery paths when profile details are incomplete.

## In Scope

- Security hardening for current MVP endpoints.
- Tests around permissions, room assignment, reports, and status transitions.
- UX cleanup for the MVP flow.
- Minimal operational admin support.
- Documentation for pilot setup and known limitations.

## Out Of Scope

- New major features.
- Native app.
- Online bookings.
- Housekeeping and maintenance.
- Payments and invoices.
- Advanced analytics.
- OTA integrations.

## Exit Criteria

- A pilot hotel can use the web dashboard for walk-in identity submissions, room assignment, check-in, checkout, and basic reports.
- Super admin can manage and observe pilot operations.
- Guest data is not exposed across hotels.
- Invalid QR and unauthorized access cases fail cleanly.
- The full MVP flow has automated smoke coverage.
- Known MVP limitations are documented.

## Verification Gates

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Type/build checks | `pnpm run check-types` | exit 0 |
| Full tests | `pnpm test` | exit 0 |

## STOP Conditions

Stop and ask for product clarification if:

- Hardening uncovers a need to redesign tenant access.
- The pilot requires payments, invoices, online bookings, housekeeping, maintenance, or native app before launch.
- Automated tests cannot reliably exercise the MVP lifecycle.
- Sensitive data is visible in logs, client errors, reports, or unauthorized responses.

