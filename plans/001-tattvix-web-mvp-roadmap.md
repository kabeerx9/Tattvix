# Plan 001: Define the Tattvix web MVP roadmap

> **Executor instructions**: This is a product and architecture planning artifact, not an implementation ticket. Use it to guide future implementation plans. Do not build every item at once. The MVP must stay focused on web check-in and check-out.
>
> **Drift check (run first)**: `git diff --stat c0d5b98..HEAD -- docs/tattvix-platform-overview.md apps/web apps/server packages/contracts`
> If the product overview or app structure changed materially since this plan was written, reconcile those changes before turning this roadmap into build tickets.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `c0d5b98`, 2026-07-08

## Product Position

Tattvix is a consent-driven hotel identity sharing and check-in platform.

For the MVP, Tattvix is **web-only**. The native app exists in the repository, but product planning and implementation should not focus on it until after the web MVP proves the core workflow.

The MVP promise is:

> A guest arrives at a hotel, scans the hotel QR, shares identity details for themselves and selected companions, completes check-in, and later checks out.

The MVP is **not** a full property management system. Room assignment, online bookings, OTA integrations, staff workflows, housekeeping, maintenance, payments, reports, and super admin workflows are future expansions. The architecture should keep space for them, but the MVP should not build them.

## MVP Boundary

### In Scope

- Web guest experience, optimized for mobile browsers.
- Web hotel dashboard, optimized for desktop and tablet reception use.
- Visit-only check-in initiated by hotel QR.
- Guest profile and identity information.
- Companion profiles attached to the main guest account.
- Companion selection during check-in.
- Explicit consent before identity data is shared.
- Hotel receipt of the approved guest and companion identity information.
- Guest stay status.
- Hotel-side check-in and check-out status updates.
- Audit trail for identity sharing and status changes.
- Minimal hotel/property setup needed to operate the flow.

### Out of Scope For MVP

- Native app implementation.
- Online pre-bookings.
- Pending booking verification.
- OTA imports.
- Room assignment during check-in.
- Room inventory management.
- Housekeeping and maintenance workflows.
- Staff scheduling or staff task assignment.
- Payments, invoices, revenue reports, and subscriptions.
- Full super admin portal.
- OCR, automated ID verification, police verification, C Form generation, and fraud scoring.
- Multi-hotel switching UI beyond the data model foundation.

## Core MVP Actors

| Actor | MVP Role |
| --- | --- |
| Guest | Creates profile, adds identity details, adds companions, scans hotel QR, approves sharing, checks out |
| Companion | A person whose identity details are entered by the guest and selected during check-in |
| Hotel Owner / Operator | Uses the hotel dashboard to view submitted identity details and update stay status |
| Tattvix Internal Admin | Uses Django admin or seed/bootstrap tooling to create and manage early hotels |

For MVP, hotel owner, manager, and reception can initially map to one dashboard role if needed. The model should still support richer roles later.

## Full Feature Plan

### 1. Identity And Consent Platform

This is the foundation of the product and remains central after MVP.

- Guest account.
- Guest profile.
- Government ID records.
- Address and emergency contact.
- Digital signature, if required for local hotel forms.
- Companion profiles.
- Companion identity records.
- Consent grant per hotel stay.
- Immutable snapshot of exactly what was shared.
- Guest-visible sharing history.
- Audit log of hotel access.

Future expansion:

- OCR extraction.
- Verified ID badges.
- ID expiry reminders.
- Selfie or liveness checks.
- Privacy controls and retention preferences.

### 2. Web Check-In And Check-Out

This is the MVP product surface.

- Hotel displays a QR code.
- Guest scans QR in a browser.
- Backend validates hotel, property, QR token, expiry, and signature.
- Guest logs in or signs up.
- Guest completes required profile fields.
- Guest adds or selects companions.
- Guest reviews exactly what will be shared.
- Guest explicitly consents.
- Backend creates a stay/check-in record.
- Hotel dashboard receives the identity submission.
- Hotel can mark the stay as checked in.
- Hotel can mark the stay as checked out.
- Guest and hotel can see current stay status.

Future expansion:

- Room assignment.
- Payment status.
- Invoice generation.
- Feedback.
- Extension requests.
- Checkout billing.

### 3. Hotel Operations

MVP should only include the parts needed to receive and manage check-in identity submissions.

- Hotel organization.
- Hotel property.
- Hotel QR token generation.
- Dashboard list of identity submissions.
- Stay detail screen.
- Status updates: submitted, checked in, checked out, cancelled/expired.
- Basic search by guest name, phone, document reference, or stay date.

Future expansion:

- Rooms.
- Reservations.
- Occupancy.
- Housekeeping.
- Maintenance.
- Reports.
- Staff roles.
- Guest history.
- Blacklist or warning flags.

### 4. Multi-Hotel Architecture

Do not build full multi-hotel UX in MVP, but design the model for it from day one.

Recommended structure:

- `Organization`: owner/business account.
- `Property`: a hotel/branch under an organization.
- `Membership`: user access to an organization and optionally scoped properties.
- `Stay`: always belongs to a property, not directly to a user only.
- `ConsentGrant`: belongs to a stay and property.
- `AuditLog`: records actor, organization, property, action, and target.

This avoids painful rewrites when one owner later manages multiple hotels.

### 5. Staff, Roles, And Permissions

Django helps with authentication, admin users, groups, and model-level permissions out of the box, but it does **not** fully solve tenant-aware hotel RBAC by itself.

Use Django's built-in auth for:

- User accounts.
- Password/session/admin handling.
- Internal Django admin access.
- Superuser/staff flags.
- Basic groups and permissions where they fit.

Architect custom RBAC for Tattvix domain access:

- Organization membership.
- Property-scoped access.
- Role enum such as owner, manager, reception, housekeeping, security, support, super_admin.
- Permission checks that include both role and tenant scope.
- DRF permissions that enforce organization/property boundaries.

Future roles can be added without changing the core stay and consent model.

### 6. Admin And Compliance

For MVP, avoid building a separate super admin portal unless absolutely required.

MVP approach:

- Use Django admin for internal hotel setup, support corrections, and operational inspection.
- Keep every sensitive action auditable.
- Store consent snapshots so hotel access is explainable later.
- Avoid exposing more guest data than the consent grant allows.

Future expansion:

- Dedicated super admin portal.
- Hotel onboarding approval.
- Support tickets.
- Fraud review.
- Platform analytics.
- Billing and subscription management.

## MVP Data Model Plan

This is a planning model, not final schema naming.

| Model | Purpose |
| --- | --- |
| User | Authenticated person in the system |
| GuestProfile | Main guest identity profile |
| CompanionProfile | Guest-managed accompanying person |
| IdentityDocument | ID document for guest or companion |
| Organization | Hotel owner or business account |
| Property | Physical hotel or branch |
| Membership | User access to organization/property |
| HotelQrToken | QR session/token for one property |
| Stay | Visit-created check-in/check-out lifecycle |
| StayParticipant | Main guest and selected companions for a stay |
| ConsentGrant | Approval record for shared data |
| SharedIdentitySnapshot | Immutable data actually shared with the hotel |
| AuditLog | Sensitive access and status-change history |

Important design choice: the hotel should read from `SharedIdentitySnapshot` for that stay, not from the guest's live profile directly. If the guest edits their profile later, the historical record remains clear.

## MVP Status Model

Recommended stay statuses:

| Status | Meaning |
| --- | --- |
| draft | QR opened, flow started, not submitted |
| awaiting_guest_details | Guest must complete profile or companion details |
| awaiting_consent | Details are ready, consent not yet granted |
| submitted_to_hotel | Guest has consented and hotel can view shared identity |
| checked_in | Hotel has accepted the arrival/check-in |
| checked_out | Stay has ended |
| cancelled | Guest or hotel cancelled before check-in |
| expired | QR/session expired before completion |

For MVP, the most important operational statuses are `submitted_to_hotel`, `checked_in`, and `checked_out`.

## MVP Phases

Each phase has a dedicated planning file so implementation can be assigned and reviewed in smaller units:

| Phase | Dedicated Plan |
| --- | --- |
| Phase 0: Product Boundary And Architecture | [plans/002-phase-0-product-boundary-architecture.md](002-phase-0-product-boundary-architecture.md) |
| Phase 1: Web Identity Foundation | [plans/003-phase-1-web-identity-foundation.md](003-phase-1-web-identity-foundation.md) |
| Phase 2: Hotel QR And Visit-Only Check-In | [plans/004-phase-2-hotel-qr-visit-check-in.md](004-phase-2-hotel-qr-visit-check-in.md) |
| Phase 3: Consent And Identity Sharing | [plans/005-phase-3-consent-identity-sharing.md](005-phase-3-consent-identity-sharing.md) |
| Phase 4: Hotel Stay Status And Check-Out | [plans/006-phase-4-stay-status-checkout.md](006-phase-4-stay-status-checkout.md) |
| Phase 5: MVP Hardening | [plans/007-phase-5-mvp-hardening.md](007-phase-5-mvp-hardening.md) |

### Phase 0: Product Boundary And Architecture

Goal: align the repo with the web-only MVP.

- Update the product overview to mark native, room assignment, reservations, staff, maintenance, payments, reports, and super admin as post-MVP.
- Add a web MVP roadmap and glossary.
- Define model names and status names before implementation.
- Confirm what identity fields are legally and operationally required for launch.

Exit criteria:

- MVP scope is documented.
- Future expansion points are named.
- No implementation ticket includes native app work or non-MVP hotel operations.

### Phase 1: Web Identity Foundation

Goal: guests can create the identity data needed for hotel check-in.

- Guest profile form.
- Identity document form/upload placeholder.
- Companion add/edit/delete.
- Required-field completeness rules.
- Guest dashboard showing profile readiness.

Exit criteria:

- A guest can prepare their own profile.
- A guest can add companion details.
- The app can determine whether profile and selected companions are ready for check-in.

### Phase 2: Hotel QR And Visit-Only Check-In

Goal: a hotel visit starts from a QR code, not from a pre-booking.

- Hotel/property bootstrap in backend.
- QR token generation and validation.
- Public QR landing route.
- Login/sign-up continuation after QR scan.
- Hotel context shown to guest before consent.

Exit criteria:

- Scanning a valid hotel QR starts a check-in flow.
- Expired or invalid QR tokens fail cleanly.
- No online booking or reservation concept is required.

### Phase 3: Consent And Identity Sharing

Goal: the guest explicitly shares selected identity information with the hotel.

- Consent review screen.
- Companion selection during check-in.
- Backend consent creation.
- Shared identity snapshot creation.
- Audit log creation.
- Hotel dashboard receives submitted identity records.

Exit criteria:

- Hotel sees only approved guest and companion details.
- Consent and shared snapshot are stored.
- Guest can see that data was shared with the hotel.

### Phase 4: Hotel Stay Status And Check-Out

Goal: complete the lifecycle from submitted identity to check-in to check-out.

- Hotel stay list.
- Stay detail view.
- Status transition controls.
- Guest-facing stay status.
- Check-out action.
- Status audit trail.

Exit criteria:

- Hotel can mark a submitted stay as checked in.
- Hotel can mark a checked-in stay as checked out.
- Guest status updates correctly.
- Invalid status transitions are blocked.

### Phase 5: MVP Hardening

Goal: make the single workflow reliable enough for real hotel pilots.

- Permission checks for hotel data access.
- Tenant/property boundaries.
- Rate limiting or abuse controls for QR endpoints.
- Basic search and filters for hotel stay list.
- Error states and empty states.
- Audit log review in Django admin.
- Smoke tests for the full check-in/check-out flow.

Exit criteria:

- A pilot hotel can use the web dashboard for walk-in check-ins.
- Guest data is not exposed across hotels.
- The check-in/check-out flow is testable and repeatable.

## Non-MVP Backlog Order

Recommended order after the MVP:

1. Room assignment and room status.
2. Multi-user hotel staff roles.
3. Housekeeping and maintenance.
4. Manual reservations for visit-created stays.
5. Payments and invoices.
6. Reports and occupancy analytics.
7. Multi-hotel owner switching UI.
8. Super admin portal.
9. OCR and verified identity.
10. OTA integrations and enterprise APIs.
11. Compliance exports such as local guest registers, police workflows, and C Form support.

## Verification Gates For Future Implementation

Known repo commands from current project metadata:

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Full test suite | `pnpm test` | exit 0 |
| Type/build checks | `pnpm run check-types` | exit 0 |
| Web dev server | `pnpm run dev:web` | starts Vite web app |
| Server dev server | `pnpm run dev:server` | starts Django API |

Each future build plan should include at least the relevant type/build check and focused backend/frontend tests for the workflow it changes.

## STOP Conditions For Future Executors

Stop and ask for product clarification if:

- A requested MVP ticket requires online booking, room assignment, staff workflows, maintenance, reports, payments, or native app work.
- Guest identity data would be shown to a hotel without an explicit consent record.
- A hotel dashboard endpoint can access stays from another property or organization.
- A status transition can skip directly from draft to checked out.
- A historical stay reads live profile data instead of the stay's shared snapshot.

## Maintenance Notes

- Keep the MVP narrow: check-in and check-out are the product.
- Build web UI responsive enough for mobile guest usage before revisiting native.
- Use organization/property foreign keys early even if the first pilot has one hotel.
- Use Django admin for internal operations until a dedicated super admin portal is justified.
- Treat RBAC as domain architecture, not just a Django group configuration problem.
