# Getting started Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Give guests and hotel owners useful, optional first-use guidance on both clients.

**Architecture:** Shared pure builders consume existing profile/details/room DTOs.
Client feature components render live task guides and scoped dismissible prompts;
existing forms, permissions and APIs retain authority.

**Tech Stack:** TypeScript, TanStack Query/Router, React, Expo Router/React Native.

**Spec:** `docs/superpowers/specs/2026-10-26-onboarding-design.md`

## Global Constraints

- Both clients; no dependencies, API changes or migrations.
- No automatic navigation, guessed completion, bypassed permissions or entitlement.
- Device-only dismissal keyed by Clerk user + guest/property + version.
- Semantic theme/shared primitives and reduced-motion support.

## Review Focus

- Profile-ready but ID-incomplete guests must see the correct next task.
- Inactive rooms and null rates must not make hotel setup ready; zero rates do.
- Switching account/property must not inherit another scope's dismissal/progress.
- Failure/loading cannot masquerade as completion; guide reloads saved state.
- Reception and expired subscriptions must not gain a setup write action.

### Task 1: Shared model (primary agent)

**Files:** `packages/api/src/onboarding.ts`, `onboarding.test.ts`, `index.ts`.

**Interfaces:** `getGuestOnboarding(profile: GuestProfileResponse): OnboardingGuide`;
`getHotelOnboarding(input: { details: PropertyDetails; rooms: HotelRoom[];
canManageHotel: boolean; canManageRooms: boolean }): OnboardingGuide | null`;
`onboardingStorageKey(clerkUserId: string, scope: string): string`.
Guide: kind, title, description, completeTitle, completeDescription, steps, tips,
completedCount, totalCount, isComplete, nextStepId. Step: id, title, description,
action (`profile` | `identity` | `property` | `rooms`), actionLabel, isComplete.
Tip: id, title, body. Export all types. Entitlement stays a client route-context
concern: disable setup write CTA, still allow reading the guide.

- [x] Write failure-mode tests in spec before builders, run red.
- [x] Implement builders/copy/key, run package tests and types.

### Task 2: Web (independent worker owns apps/web only)

- [x] Read shared interface and existing feature query/UI patterns.
- [x] Add guide and prompt feature components, persistence; routes `/getting-started`
  and `/hotel/$organizationSlug/$propertySlug/getting-started`.
- [x] Integrate guest home, eligible Today, Help replay/property choices, and
  profile/details/rooms return links. Render explicit loading/retry/read-only states.
- [x] Run web check-types/test/build and report evidence. Do not commit independently.

### Task 3: Native (independent worker owns apps/native only)

- [x] Read shared interface, existing native design system and route guards.
- [x] Add guide/prompt components and SecureStore preferences; `(guest)/getting-started`
  and `(hotel)/[organizationSlug]/[propertySlug]/getting-started` screens.
- [x] Integrate guest home, eligible Today, Help replay choices and profile/details/
  rooms return links. Handle query refresh, errors, entitlement and role changes.
- [x] Run native types/tests and report evidence. No commits, rebuild or auth changes.

### Task 4: Integration, review and verification (primary agent)

- [x] Review both workers against shared spec and resolve issues.
- [x] Run required checks and web + emulator UI matrix, fix regressions.
- [x] Save evidence and limitations, commit scoped files, push main under standing authority.
