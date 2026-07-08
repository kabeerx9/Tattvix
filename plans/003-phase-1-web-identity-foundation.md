# Plan 003: Build the web identity foundation

> **Executor instructions**: This phase creates the guest and companion identity base needed before QR check-in can work. Do not build QR, consent submission, hotel dashboard intake, or checkout in this phase.
>
> **Drift check (run first)**: `git diff --stat c0d5b98..HEAD -- apps/web apps/server packages/contracts plans`
> If auth, current user sync, or route structure changed, inspect the live code before implementation planning.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: [plans/002-phase-0-product-boundary-architecture.md](002-phase-0-product-boundary-architecture.md)
- **Category**: direction
- **Planned at**: commit `c0d5b98`, 2026-07-08

## Why This Matters

Check-in cannot be fast if the guest has no reusable identity profile. This phase makes the web app useful before a hotel QR is scanned: the guest can prepare their own details and companion details, and the system can determine whether the profile is ready for check-in.

## Phase Goal

A signed-in guest can manage identity data for themselves and companions in the web app.

## User Capabilities

- View profile readiness.
- Create or update main guest profile.
- Add, edit, and remove companions.
- Add identity document details for guest and companions.
- See which required fields are missing.
- Save progress without starting a hotel stay.

## Backend Capabilities

- Persist guest profile for the authenticated user.
- Persist companion profiles owned by the authenticated user.
- Persist identity document metadata for guest and companions.
- Enforce ownership so one user cannot read or modify another user's companions.
- Expose typed API responses for web consumption.

## Frontend Capabilities

- Profile page or dashboard section for main guest details.
- Companion list with add/edit form.
- Required-field indicators.
- Mobile-friendly form layout, because web is the MVP guest surface.
- Empty states for no companions and no documents.

## Data Model Notes

Recommended model concepts:

- `GuestProfile`: one per user.
- `CompanionProfile`: many per user.
- `IdentityDocument`: attached to either guest profile or companion profile.

Avoid attaching companions to a stay in this phase. Stay participants belong to the check-in phase after QR flow exists.

## In Scope

- Guest profile CRUD.
- Companion CRUD.
- Identity document metadata CRUD.
- Required-field completeness checks.
- Contracts/types for profile and companion APIs.
- Tests for ownership and validation.

## Out Of Scope

- QR token handling.
- Consent grants.
- Shared identity snapshots.
- Hotel dashboard intake.
- Check-in or check-out statuses.
- File upload storage hardening beyond what is needed for metadata placeholders.

## Exit Criteria

- A guest can prepare their own profile.
- A guest can add at least one companion with required details.
- The app can determine whether guest and selected companions are ready for check-in.
- API ownership tests prove users cannot access each other's companions.

## Verification Gates

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Type/build checks | `pnpm run check-types` | exit 0 |
| Full tests | `pnpm test` | exit 0 |

## STOP Conditions

Stop and ask for product clarification if:

- Required identity fields are still undecided.
- The implementation would require native app work.
- Identity data would be stored without an ownership boundary.
- Companion data is modeled only as free text on the guest instead of separate profiles.

