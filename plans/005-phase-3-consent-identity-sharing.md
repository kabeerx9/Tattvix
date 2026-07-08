# Plan 005: Build consent and identity sharing

> **Executor instructions**: This is the core MVP value phase. The hotel must receive identity information only after explicit consent. Do not add room assignment, payments, or staff workflows.
>
> **Drift check (run first)**: `git diff --stat c0d5b98..HEAD -- apps/web apps/server packages/contracts plans`
> If QR check-in start or identity foundation is incomplete, stop and complete Plans 003 and 004 first.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: [plans/004-phase-2-hotel-qr-visit-check-in.md](004-phase-2-hotel-qr-visit-check-in.md)
- **Category**: direction
- **Planned at**: commit `c0d5b98`, 2026-07-08

## Why This Matters

This is the product: one scan, one consent, hotel receives approved identity details. Getting the consent boundary wrong would expose sensitive guest information and damage the core trust model.

## Phase Goal

The guest reviews and approves exactly what identity information is shared with the hotel, including selected companions. The hotel receives only the approved stay-specific snapshot.

## User Flow

1. Guest reaches consent screen from a valid QR flow.
2. Guest sees hotel/property name.
3. Guest sees their own identity details that will be shared.
4. Guest selects which companions are accompanying.
5. Guest sees companion details that will be shared.
6. Guest explicitly approves.
7. Backend creates consent grant and shared identity snapshot.
8. Stay status becomes `submitted_to_hotel`.
9. Hotel dashboard can view the submitted identity package.
10. Hotel proceeds to room assignment in the next phase.

## Backend Capabilities

- `StayParticipant` for main guest and selected companions.
- `ConsentGrant` with timestamp, hotel/property, actor, and selected data categories.
- `SharedIdentitySnapshot` that copies the approved guest and companion data at submission time.
- Audit log for consent creation and hotel view.
- API endpoint for hotel dashboard to list submitted stays scoped to property access.
- API endpoint for hotel dashboard to view one stay's shared identity snapshot.

## Frontend Capabilities

- Consent review screen.
- Companion selection UI.
- Clear approval action.
- Submitted confirmation screen for guest.
- Hotel dashboard submitted-stays list.
- Hotel stay detail page showing approved identity data.
- Clear handoff state showing the stay is ready for room assignment.

## In Scope

- Consent creation.
- Companion selection for a stay.
- Shared identity snapshot creation.
- Hotel receipt of submitted identity information.
- Audit log entries.
- Tenant/property-scoped data access.

## Out Of Scope

- Room assignment.
- Room status.
- Payment status.
- Room assignment.
- Check-out.
- Reports.
- Staff role UI.

## Exit Criteria

- Hotel sees only approved guest and companion details.
- Historical stay data does not change when the guest edits their profile later.
- Guest can see that information was shared with the hotel.
- Property access checks prevent cross-hotel data reads.
- No hotel identity endpoint returns live guest profile data directly.

## Verification Gates

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Type/build checks | `pnpm run check-types` | exit 0 |
| Full tests | `pnpm test` | exit 0 |

## STOP Conditions

Stop and ask for product clarification if:

- Consent can be bypassed.
- Hotel APIs read from live guest profile instead of shared snapshot.
- Companion selection is skipped or treated as free text.
- Data access cannot be scoped to organization/property.
- A requested change introduces room assignment into this phase.
