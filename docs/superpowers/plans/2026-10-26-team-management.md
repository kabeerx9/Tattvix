# Team Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Owners manage existing Tattwix users and their hotel access in web and native.

**Architecture:** Organization-scoped owner endpoints use transactional team services; legacy platform membership adapters share the same organization lock and tested invariants while retaining their request/response contracts. Preserve existing API shapes; put new DTOs, query factories and form rules in the shared packages. An organization row lock coordinates authority checks and last-owner protection across both write paths.

**Tech Stack:** Django REST Framework, PostgreSQL, Zod, TanStack Query, TanStack Router, Expo Router, existing web/native design systems.

**Spec:** `docs/superpowers/specs/2026-10-26-team-management.md`

## Global Constraints

- Every behavior and UI change lands in web and native together.
- Existing strict `/api/me/` and platform response shapes stay unchanged.
- New members must be selected existing accounts; no invitations.
- Co-owners have full organization authority. Manager/Reception use selected-property scope.
- Preserve historical scopes until explicitly changed; new/promoted owners get all-properties access.
- Keep the existing last-active-owner invariant and ADR 0004 subscription gate.
- Read `docs/design-system.md` and `apps/native/docs/design-system.md`; reuse shared primitives.
- No remote account changes, email sending, deployment or OTA publishing is implied. Direct main pushes follow the user's standing instruction in this session.

## Review Focus

- Owner access revoked while a write waits for the organization lock: recheck authority inside the transaction.
- Two owners removing/demoting each other, including platform writes: preserve an active owner with no stale-authority writes.
- User selection becomes stale or duplicate membership exists: never fall back to raw email or create duplicate membership.
- Foreign/inactive property IDs and legacy all-properties members: reject invalid grants and avoid silently changing existing scope.
- Removing the current user's authority: refresh `/me`, evict inaccessible caches and reroute both clients.

### Task 1: Shared contracts and client rules

**Files:** Create `packages/contracts/src/team.ts`, `packages/contracts/src/team.test.ts`, `packages/api/src/team.ts`, `packages/api/src/team.test.ts`; modify both packages' `src/index.ts`.

**Interfaces:**
- `teamUserSearchResponseSchema`: bounded array of `{id,email,firstName,lastName}`.
- `teamListResponseSchema`: organization, manageable active properties, subscription, and members with user identification, role, active status, all-properties flag and selected property IDs.
- Add input: `{userId,role,propertyIds}`. Owner requires all-properties semantics and an empty selection; other roles require at least one selected property.
- Update input: explicit role/scope and/or active-state change. Demoting Owner requires an explicit valid non-owner scope. Never accept organization or actor authority from the body.
- `createTeamApi(client)` methods: `list(org)`, `searchUsers(org,email)`, `add(org,input)`, `update(org,memberId,input)`.
- Query key root `['team', organizationSlug]`; search keys include org and normalized search term. Shared mutation options invalidate team/current-user and relevant platform organization/portfolio caches.

- [x] Write failing contract tests for empty/duplicate property IDs, unknown fields, invalid roles, Owner versus staff scopes, empty updates and malformed selected user IDs.
- [x] Run `pnpm --filter @tattvix/contracts test`; observe the new cases fail.
- [x] Implement strict schemas and pure form rules; add API transport/query/mutation tests for organization escaping, selected IDs, rejected responses and targeted invalidation.
- [x] Run `pnpm --filter @tattvix/contracts test`, `pnpm --filter @tattvix/api test`, and both packages' `check-types`; all pass.
- [x] Commit only this task's files.

### Task 2: Owner API and shared membership service

**Files:** Create `apps/server/api/team.py`, `team_views.py`, `team_serializers.py`, `memberships.py`, `tests/test_team_api.py`, `tests/test_team_concurrency.py`; modify `platform_admin.py`, `urls.py`, `models.py` and `tattvix/settings.py` as required for audit action/throttle configuration; preserve platform adapters.

**Interfaces:**
- `GET/POST /api/hotel/<organization_slug>/team/` lists/adds.
- `GET /api/hotel/<organization_slug>/team/users/?email=...` searches existing accounts for an authorized owner.
- `PATCH /api/hotel/<organization_slug>/team/<membership_id>/` changes role/scope or active state.
- Shared services: `add_team_member(*, organization, actor, user_id, role, property_ids)` and `update_team_member(*, organization, actor, membership_id, role=None, property_ids=None, is_active=None)`, with explicit owner/platform actor policy rather than a body-controlled bypass.
- Existing `add_organization_member` and `update_organization_member` remain backwards-compatible adapters and acquire the same organization lock through the shared service.
- Validation errors are 400; membership conflicts/last-owner are 409 on new endpoints; unauthorized requests are 403 without leaking target membership existence; foreign organization/member/property resources return 404. Expired writes return existing 402 payload.

- [x] Write failing API tests for owner/staff/guest/unrelated-owner access, inactive organization/actor, selected IDs, unknown users, search bounds/throttle, case-insensitive matches, duplicate add/reactivation, foreign/inactive property IDs, partial writes, all-properties Owner promotion and existing restricted-owner behavior.
- [x] Include expired read/write tests and regression assertions that legacy platform requests and response keys are unchanged.
- [x] Run `pnpm --filter server test api.tests.test_team_api --noinput`; observe expected failures.
- [x] Implement owner authorization and bounded search. Lock organization before actor/target membership checks; update memberships, scopes and audits atomically. Preserve old platform error mapping at its adapter.
- [x] Add a property-scope-change audit action; generate a migration only if Django detects changed model state. Do not migrate old access scopes or broaden them implicitly.
- [x] Use PostgreSQL `TransactionTestCase` and separate connections, following `tests/test_billing_concurrency.py`. Prove duplicate additions create one row; owner-v-owner and platform-v-owner demotion/deactivation preserve at least one active owner; an actor removed while waiting cannot mutate; concurrent metadata changes preserve explicitly untouched fields.
- [x] Run team API/concurrency tests plus `test_platform_admin_api`, `test_platform_onboarding_api`, `test_me_api`, `test_subscriptions_api` and `test_rbac`. All pass against PostgreSQL; no skipped concurrency evidence.
- [x] Commit the verified server slice.

### Task 3: Web and native Team screens

**Files:** Create `apps/web/src/features/team/{api,queries,mutations}.ts`, `components/team-page.tsx`, `components/team-member-form.tsx`, `apps/web/src/routes/_auth/_hotel/hotel/$organizationSlug/team.tsx`, `apps/native/app/(hotel-team)/[organizationSlug]/team.tsx`, `apps/native/app/(hotel-team)/_layout.tsx`, `apps/native/src/components/team-member-form.tsx`; modify account settings and native API/root routing as needed.

**Interfaces:** Consume Task 1 API factories and Task 2 payloads; owner account cards link to organization Team routes, including organizations with no property. Native organization-level routing must not require a property route to exist.

- [x] Build owner-only route guards from refreshed `/me`; handle pending/error before deciding a person is a guest. Keep authorization server-enforced.
- [x] Build Team lists with active/inactive state, role and access scope; clearly label legacy all-properties access as including future properties.
- [x] Build debounced email search (300ms, 3+ characters, max 10), explicit selection, selected-user reset on edit and no-match guidance to register first. Key queries by org/search to prevent old results attaching to the current search.
- [x] Use shared role/scope rules: selected properties for new staff, all properties for Owner, explicit selection when demoting Owner. Preserve legacy scopes on unrelated updates.
- [x] Add edit, deactivate/reactivate, full-owner warning and self-access-change confirmation. Explain 402 and last-owner conflicts without hiding cached team records.
- [x] Add Team links under each owned organization in web settings and native account sections. Do not expose unimplemented invitations or guest-account deletion controls.
- [x] Test owner versus staff navigation, empty organizations, search error/selection reset, revoked-current-user invalidation and role/scope form validation through meaningful shared/client tests.
- [x] Run web `check-types`, `test`, `build`; native `check-types` (`tsc --noEmit`) and `test`; shared package checks. All pass.
- [x] Commit web and native together.

### Task 4: Full-flow verification and delivery

**Files:** Update the spec/plan only for accepted changes and actual verification results; no unrelated cleanup.

- [x] Against a local PostgreSQL-backed server, verify owner adds an existing user, assigns a property, changes role/scope, deactivates and reactivates. Verify the selected user sees exactly their granted hotels on next refresh.
- [x] Check web narrow/desktop layouts and Android emulator owner/staff states, search keyboard behavior, selected-property controls, empty/error/expired states and self-access redirects. Label any preview-only evidence separately from authenticated end-to-end checks.
- [x] Parse a real authenticated `/me` response with the pre-change strict schema and run legacy API workflow regressions; new endpoints must not alter legacy payloads. A previously installed release APK was not relaunched.
- [x] Review final diff for cross-organization grants, stale actor checks, audit completeness, dropped metadata and race-test evidence.
- [x] Stage only task files, commit with a short imperative subject, and push directly to main under the standing session instruction. Read CI results and report actual state.
- [x] Report native OTA as a separate release step requiring explicit publishing authority; do not claim installed phones received this feature from the Git push.

## Execution record

Completed locally on 2026-10-26. See `docs/verification/2026-10-26-team-management.md` for actual commands, UI/API evidence, independent-review fixes, deviations and retained local test state. Services live in `apps/server/api/team.py` rather than a separate `memberships.py`; no behavior depends on the planned file split. Web query factories/mutations are imported directly from `@tattvix/api` through the feature API module instead of extra forwarding-only modules.

The final delivery checkbox records code verification and the authorized main push; OTA/manual deployment remains separately unauthorized and unpublished.
