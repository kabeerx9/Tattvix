# Plan 008: Build MVP reports

> **Executor instructions**: This phase adds basic reports for hotel owner/staff and super admin. Do not add payments, invoices, revenue analytics, or advanced BI.
>
> **Drift check (run first)**: `git diff --stat c0d5b98..HEAD -- apps/web apps/server packages/contracts plans`
> If room assignment, stay statuses, or super admin are incomplete, stop and complete Plans 006 and 007 first.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: [plans/007-phase-5-super-admin-dashboard.md](007-phase-5-super-admin-dashboard.md)
- **Category**: direction
- **Planned at**: commit `c0d5b98`, 2026-07-08

## Why This Matters

Hotels and platform operators need basic visibility during the MVP. Reports should answer operational questions about check-ins, check-outs, current stays, room assignment, and usage without pulling the product into payments or analytics too early.

## Phase Goal

Provide simple, permission-scoped reports for hotel owner/staff and super admin.

## Hotel Reports

- Today's submitted identity details.
- Today's checked-in stays.
- Today's checked-out stays.
- Current active stays.
- Room assignment/occupancy summary.
- Stay status counts over a date range.

## Super Admin Reports

- Active hotels/properties.
- Check-ins by property.
- Check-outs by property.
- Current stays by property.
- Platform usage counts.
- Basic audit activity counts.

## Backend Capabilities

- Report endpoints scoped by organization/property for hotel users.
- Platform-wide report endpoints scoped to super admin.
- Date range filters.
- Status filters.
- Aggregations that do not expose unnecessary guest identity fields.

## Frontend Capabilities

- Hotel reports page.
- Super admin reports page.
- Date filters.
- Clear empty states.
- Export can be deferred unless pilot operations require it.

## In Scope

- Operational reports.
- Stay and room assignment counts.
- Super admin platform counts.
- Permission-scoped report access.

## Out Of Scope

- Revenue reports.
- Payments.
- Invoices.
- Forecasting.
- Advanced analytics dashboards.
- OTA reporting.

## Exit Criteria

- Hotel owner/staff can view basic reports for their property only.
- Super admin can view platform-level reports.
- Reports do not expose sensitive guest identity fields unnecessarily.
- Revenue and payment reporting are not included.

## Verification Gates

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Type/build checks | `pnpm run check-types` | exit 0 |
| Full tests | `pnpm test` | exit 0 |

## STOP Conditions

Stop and ask for product clarification if:

- Reports require payment or invoice data.
- Hotel users can see reports for another property without permission.
- Report exports become required before the report data model is stable.
- Reports expose raw identity documents when counts or stay metadata would be enough.

