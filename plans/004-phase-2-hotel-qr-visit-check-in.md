# Plan 004: Build hotel QR and visit-only check-in start

> **Executor instructions**: This phase starts a hotel visit from a QR code. It should not submit identity data to the hotel yet; that belongs to the consent phase.
>
> **Drift check (run first)**: `git diff --stat c0d5b98..HEAD -- apps/web apps/server packages/contracts plans`
> If the identity foundation is not complete, stop and complete Plan 003 first.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: [plans/003-phase-1-web-identity-foundation.md](003-phase-1-web-identity-foundation.md)
- **Category**: direction
- **Planned at**: commit `c0d5b98`, 2026-07-08

## Why This Matters

The MVP has no online pre-bookings. Every stay starts when a guest physically visits a hotel and scans the hotel QR. This phase creates that entry point while keeping the flow simple and visit-first.

## Phase Goal

A valid hotel QR opens a web check-in flow tied to a specific property.

## User Flow

1. Hotel displays a QR code.
2. Guest scans QR with phone browser.
3. Web app validates QR token with backend.
4. Guest sees hotel/property context.
5. Guest signs in or signs up if needed.
6. Guest resumes the check-in flow after auth.
7. App shows profile readiness and next required step.

## Backend Capabilities

- Minimal `Organization` and `Property` records.
- Minimal hotel owner/staff membership needed to generate or display property QR codes.
- `HotelQrToken` generation for one property.
- QR payload validation with token, expiry, property, and signature or secure random token.
- Draft `Stay` creation or resumable check-in session after QR validation.
- Clean failure responses for invalid, expired, disabled, or unknown QR tokens.

## Frontend Capabilities

- Public QR landing route.
- Auth continuation after QR scan.
- Hotel context screen.
- Profile readiness gate.
- Continue-to-consent placeholder after identity readiness.

## In Scope

- Hotel/property bootstrap sufficient for local development and first pilot.
- Basic owner/staff access to the property QR route or endpoint.
- QR token generation and validation.
- Visit-created draft stay/check-in session.
- Guest route for scanned QR.
- Auth-safe continuation after login/sign-up.

## Out Of Scope

- Online booking.
- Room assignment.
- Consent submission.
- Hotel dashboard receipt of guest identity.
- Check-in completion.
- Check-out.

## Exit Criteria

- Scanning a valid QR starts a property-scoped check-in flow.
- Expired or invalid QR tokens fail cleanly.
- The flow survives login/sign-up.
- No reservation or pre-booking record is required.

## Verification Gates

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Type/build checks | `pnpm run check-types` | exit 0 |
| Full tests | `pnpm test` | exit 0 |

## STOP Conditions

Stop and ask for product clarification if:

- The implementation starts requiring an online reservation before check-in.
- QR validation does not bind the flow to a property.
- Invalid QR tokens reveal hotel or guest data.
- The flow cannot resume after authentication.
