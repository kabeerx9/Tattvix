# Plan 006: Build stay status and check-out

> **Executor instructions**: This phase completes the MVP lifecycle after identity has been submitted to the hotel. Keep status transitions simple. Do not add room inventory, payment, invoices, or housekeeping.
>
> **Drift check (run first)**: `git diff --stat c0d5b98..HEAD -- apps/web apps/server packages/contracts plans`
> If consent and identity sharing are incomplete, stop and complete Plan 005 first.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: [plans/005-phase-3-consent-identity-sharing.md](005-phase-3-consent-identity-sharing.md)
- **Category**: direction
- **Planned at**: commit `c0d5b98`, 2026-07-08

## Why This Matters

The MVP is not finished when the hotel receives identity data. The stay needs a visible lifecycle so both guest and hotel know whether the guest is submitted, checked in, or checked out.

## Phase Goal

Hotel can move a submitted stay through check-in and check-out, and guest can see the current status.

## Status Model

Use the master roadmap status model:

- `submitted_to_hotel`
- `checked_in`
- `checked_out`
- `cancelled`
- `expired`

Earlier setup statuses such as `draft`, `awaiting_guest_details`, and `awaiting_consent` may exist before submission, but this phase focuses on the hotel-visible lifecycle.

## Backend Capabilities

- Status transition API.
- Validation that only allowed transitions occur.
- Property-scoped permission checks for hotel status changes.
- Audit log entries for each status change.
- Guest API to view current stay status.
- Hotel API to filter stays by status and date.

## Frontend Capabilities

- Hotel stay list grouped or filterable by status.
- Stay detail status controls.
- Guest status screen or dashboard card.
- Clear checked-out state.
- Error state for invalid transitions.

## In Scope

- Status transitions.
- Check-in action.
- Check-out action.
- Guest status display.
- Hotel status filters.
- Audit logs for status changes.

## Out Of Scope

- Room assignment.
- Invoice generation.
- Payment collection.
- Housekeeping cleaning state.
- Feedback capture.
- Revenue reports.

## Exit Criteria

- Hotel can mark a submitted stay as checked in.
- Hotel can mark a checked-in stay as checked out.
- Guest sees the current stay status.
- Invalid transitions are blocked.
- Status changes are audited.

## Verification Gates

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Type/build checks | `pnpm run check-types` | exit 0 |
| Full tests | `pnpm test` | exit 0 |

## STOP Conditions

Stop and ask for product clarification if:

- A status transition can skip from draft or awaiting consent directly to checked out.
- Checkout requires payments or invoice work to proceed.
- Room cleaning or maintenance states become required for MVP checkout.
- Hotel users can update stays outside their property scope.

