# Plan 007: Build the MVP super admin dashboard

> **Executor instructions**: This phase creates a minimal web super admin dashboard for Tattvix operators. Do not turn it into a full support, billing, fraud, or analytics portal.
>
> **Drift check (run first)**: `git diff --stat c0d5b98..HEAD -- apps/web apps/server packages/contracts plans`
> If the organization/property/membership model is not present, align this phase with the implemented RBAC model before proceeding.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: [plans/006-phase-4-room-assignment-status-checkout.md](006-phase-4-room-assignment-status-checkout.md)
- **Category**: direction
- **Planned at**: commit `c0d5b98`, 2026-07-08

## Why This Matters

The MVP needs a platform operator surface. Relying only on Django admin would be fast, but it would not validate the product's actual admin model or give non-engineering operators a safe dashboard for hotel setup and oversight.

## Phase Goal

Super admin can manage the minimum platform entities needed for pilots and monitor the MVP workflow without bypassing privacy boundaries.

## User Type

Super admin is a platform-level user type. It is separate from:

- Guest.
- Hotel owner.
- Hotel staff.

Django `is_staff` and `is_superuser` can still control Django admin access, but the web super admin dashboard should use explicit platform-level authorization.

## Backend Capabilities

- Super admin permission check.
- APIs for listing and managing organizations.
- APIs for listing and managing properties.
- APIs for assigning hotel owner/staff memberships.
- Read-only stay overview across properties.
- Read-only audit log overview.
- Privacy-aware access to shared identity snapshots: super admin should see sensitive data only when there is a clear operational reason and it is audited.

## Frontend Capabilities

- Super admin route group.
- Platform overview.
- Organization list/detail.
- Property list/detail.
- Hotel owner/staff membership management.
- Stay overview across properties.
- Audit log view.

## In Scope

- Minimal web super admin dashboard.
- Hotel/property management.
- Hotel owner/staff access management.
- Platform-level stay visibility.
- Audit visibility.

## Out Of Scope

- Billing and subscriptions.
- Fraud review workflows.
- Support ticketing.
- Advanced analytics.
- Revenue reports.
- Automated hotel approval workflows beyond basic activation fields.

## Exit Criteria

- Super admin can create and manage hotels/properties.
- Super admin can manage hotel owner/staff access.
- Super admin can see platform-level stay and audit information.
- Super admin access is denied to non-super-admin users.
- Sensitive data access is audited.

## Verification Gates

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Type/build checks | `pnpm run check-types` | exit 0 |
| Full tests | `pnpm test` | exit 0 |

## STOP Conditions

Stop and ask for product clarification if:

- Super admin permissions are implemented only through a global frontend flag.
- Super admin can mutate guest identity data directly.
- Super admin sensitive-data access is not audited.
- The scope expands into billing, support, fraud, or advanced analytics.

