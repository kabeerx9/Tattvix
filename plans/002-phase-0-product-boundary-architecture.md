# Plan 002: Lock the web MVP product boundary and architecture

> **Executor instructions**: This is a planning phase. Do not implement product workflows yet. The output of this phase should make future build tickets unambiguous.
>
> **Drift check (run first)**: `git diff --stat c0d5b98..HEAD -- plans docs/tattvix-platform-overview.md README.md apps/web apps/server packages/contracts`
> If the master roadmap or product overview changed, reconcile those changes before proceeding.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: [plans/001-tattvix-web-mvp-roadmap.md](001-tattvix-web-mvp-roadmap.md)
- **Category**: direction
- **Planned at**: commit `c0d5b98`, 2026-07-08

## Why This Matters

The current product overview is broader than the MVP. It includes native app work, room operations, online reservations, reports, staff workflows, and super admin concepts. This phase prevents the first build cycle from drifting into a property management system before the core identity-sharing workflow is proven.

## Phase Goal

Align the repo around a web-only MVP:

> Guest scans hotel QR, shares identity information for themselves and selected companions, hotel receives the information, hotel marks check-in and check-out status.

## Deliverables

- A concise MVP glossary covering `Organization`, `Property`, `GuestProfile`, `CompanionProfile`, `Stay`, `StayParticipant`, `ConsentGrant`, `SharedIdentitySnapshot`, and `AuditLog`.
- A refined product overview section clearly marking native, online bookings, housekeeping, maintenance, payments, invoices, OTA integrations, and advanced verification as post-MVP.
- A data model architecture note confirming multi-hotel readiness without building multi-hotel UX.
- A user-type and permissions architecture note explaining guest, hotel owner/staff, and super admin access. Django auth is used for accounts/admin, while Tattvix needs custom tenant-aware RBAC.
- A list of required identity fields for the first launch, recorded in [docs/mvp-identity-contract.md](../docs/mvp-identity-contract.md). Legal/operator validation remains a production-launch gate.

## In Scope

- Documentation under `plans/` and `docs/`.
- Naming decisions for future backend models and frontend routes.
- MVP boundary and non-MVP backlog ordering.
- Architecture constraints that protect future expansion.
- MVP user types and role boundaries.
- MVP scope for super admin, room assignment, and reports.

## Out Of Scope

- Backend model implementation.
- Database migrations.
- UI implementation.
- Native app work.
- Product implementation beyond planning decisions. The actual room assignment, report, and super admin builds belong to their dedicated phase plans.

## Decisions To Preserve

- MVP is web-only.
- MVP check-ins are visit-created only.
- Room assignment after identity submission is part of MVP.
- Basic reports are part of MVP, but revenue/payment reports are post-MVP.
- Super admin dashboard is part of MVP.
- Companion selection is part of MVP.
- Hotels must read a stay-specific shared identity snapshot, not the guest's live profile.
- Data access must be scoped by organization and property even if the first pilot has one property.

## Exit Criteria

- Future implementation plans can reference one agreed vocabulary.
- No MVP build ticket needs to decide whether native, online bookings, housekeeping, maintenance, payments, invoices, OTA, or advanced verification are in scope.
- Future build tickets clearly distinguish guest, hotel owner/staff, and super admin behavior.
- Product docs separate MVP from future vision.
- RBAC direction is documented before endpoint work begins.

## Verification Gates

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Check docs exist | `find plans docs -maxdepth 2 -type f` | roadmap and phase docs are listed |
| Inspect changed files | `git status --short` | only planning/docs files changed |

## STOP Conditions

Stop and ask for product clarification if:

- Required hotel identity fields cannot be agreed before implementation starts.
- A stakeholder wants online booking, housekeeping, maintenance, payments, invoices, OTA, advanced verification, or native app work in the first MVP build.
- The team wants to rely only on global Django groups for property-scoped hotel access.
