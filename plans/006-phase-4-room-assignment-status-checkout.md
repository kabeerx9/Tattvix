# Plan 006: Build room assignment, stay status, and check-out

> **Executor instructions**: This phase completes the hotel operational lifecycle after identity has been submitted. Keep room management simple: enough to assign a room and report occupancy, not full housekeeping or maintenance.
>
> **Drift check (run first)**: `git diff --stat c0d5b98..HEAD -- apps/web apps/server packages/contracts plans`
> If consent and identity sharing are incomplete, stop and complete Plan 005 first.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: [plans/005-phase-3-consent-identity-sharing.md](005-phase-3-consent-identity-sharing.md)
- **Category**: direction
- **Planned at**: commit `c0d5b98`, 2026-07-08

## Why This Matters

After the hotel receives the approved identity details, the next operational step is assigning a room. The MVP needs this step because it turns identity sharing into an actual hotel check-in workflow, while still avoiding full property-management complexity.

## Phase Goal

Hotel owner/staff can assign a room to a submitted stay, mark the stay checked in, and later check it out. Guest can see the current stay status.

## Status Model

Use the master roadmap status model:

- `submitted_to_hotel`
- `room_assigned`
- `checked_in`
- `checked_out`
- `cancelled`
- `expired`

Earlier setup statuses such as `draft`, `awaiting_guest_details`, and `awaiting_consent` may exist before submission, but this phase focuses on the hotel-visible lifecycle.

## Backend Capabilities

- Simple `Room` model under `Property`.
- Room fields: room number/name, room type/category if needed, active flag, simple status.
- Room assignment API for a submitted stay.
- Validation that a room belongs to the same property as the stay.
- Validation that unavailable/occupied rooms cannot be assigned to another active stay.
- Status transition API.
- Validation that only allowed transitions occur.
- Property-scoped permission checks for hotel owner/staff status changes.
- Audit log entries for room assignment and each status change.
- Guest API to view current stay status and assigned room label if appropriate.
- Hotel API to filter stays by status, room, and date.

## Frontend Capabilities

- Hotel room setup list sufficient for MVP assignment.
- Room selector on stay detail after identity submission.
- Hotel stay list grouped or filterable by status.
- Stay detail status controls.
- Guest status screen or dashboard card.
- Clear checked-out state.
- Error state for invalid transitions or unavailable rooms.

## In Scope

- Simple room inventory needed for assignment.
- Room assignment after identity submission.
- Status transitions.
- Check-in action.
- Check-out action.
- Guest status display.
- Hotel status filters.
- Audit logs for assignment and status changes.

## Out Of Scope

- Housekeeping cleaning state.
- Maintenance state.
- Payments.
- Invoice generation.
- Feedback capture.
- Revenue reports.
- Advanced room pricing and rate plans.

## Exit Criteria

- Hotel can assign a room after receiving submitted identity details.
- Hotel can mark a room-assigned stay as checked in.
- Hotel can mark a checked-in stay as checked out.
- Guest sees the current stay status.
- Invalid room assignments and status transitions are blocked.
- Room assignment and status changes are audited.

## Verification Gates

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Type/build checks | `pnpm run check-types` | exit 0 |
| Full tests | `pnpm test` | exit 0 |

## STOP Conditions

Stop and ask for product clarification if:

- A status transition can skip from draft or awaiting consent directly to checked out.
- Checkout requires payments or invoice work to proceed.
- Room cleaning, housekeeping, or maintenance states become required for MVP checkout.
- Hotel users can assign rooms or update stays outside their property scope.
- Room assignment needs online booking or reservation logic.

