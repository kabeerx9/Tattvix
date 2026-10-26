# Owner-managed hotel teams

## Agreed product behavior

- Owners manage teams from both web and native account settings.
- Add flow: search existing Tattwix users by email, select a result, choose role and property access, then confirm. Unknown users must register first. No invitations or account creation in this slice.
- Manager and Reception are assigned explicitly selected properties from the owner's accessible properties.
- Owner is a full co-owner of the organization: all-properties access and authority to add people, change roles, deactivate/reactivate access, including other owners' access. No founder or superior-owner role.
- Keep the existing last-active-owner safeguard. Self-demotion/deactivation is permitted when another active owner remains, with confirmation.
- Removing access deactivates membership; it does not delete the person's account, stays or audit history.

## Implementation boundaries

- Use existing Membership, MembershipPropertyAccess, role permissions and subscription dates. No changes to existing `/api/me/` or platform response shapes; installed native clients must keep working.
- Add an owner-authorized organization-scoped API, separate from platform-admin endpoints. Managers' existing `members:view` permission is not authorization to use owner-management or user-search endpoints.
- Search follows the current platform search interaction: case-insensitive email substring, minimum 3 characters, maximum 100, at most 10 results. Owner-only endpoint, per-user throttle, no result caching at the HTTP/CDN layer. Return only selected-account identification fields; never guest identity documents, profiles or claims. Clear selection when search changes, discard out-of-order results, and submit selected user ID rather than free text.
- Existing all-properties or property-restricted memberships retain their scope unless deliberately changed. New/promoted owners receive all-properties access. New Manager/Reception memberships require a nonempty selected-property set; future properties are not added automatically.
- An organization lock serializes every member mutation across owner and platform entry points. Recheck the actor's current authority after acquiring the lock. Write membership, property-access rows and audit events atomically. At least one active owner must remain; do not assume every historical owner already has all-properties access.
- Existing platform operations preserve their current request/response contracts and global-admin authorization. Shared services must not turn an owner into a platform administrator.
- Team reads remain available after subscription expiry; team writes retain ADR 0004's existing subscription gate. This version does not introduce a security-action exception to that gate.
- Normal authorized concurrent updates serialize; the last committed explicitly requested field change wins. Duplicate adds produce one membership and a clear existing-member response. Reactivation uses the existing inactive row.
- Refresh the acting user's `/me`, team and affected organization/portfolio caches after mutations. On lost access, clear inaccessible data and reroute; every server request rechecks membership independently of UI cache. Other devices use the existing focus/reconnect and permission-failure refresh behavior, without a new realtime delivery guarantee.

## UI

Organization-level Team link under each owned organization in account settings. Team list shows name/email, role, property scope and active status. Add and edit forms share role/property rules through `@tattvix/contracts` and `@tattvix/api`. Explicit confirmation for granting Owner, removing access and changing one's own authority. Role and scope changes are one atomic operation where needed. Include loading, search empty/error, retry, duplicate-member, inactive-member, subscription-locked and last-owner states.

## Acceptance

Both clients can complete add, role/scope edit, deactivate and reactivate. Guest/staff/unrelated-owner requests are rejected. Cross-organization property IDs never grant access. Stale selections and foreign member IDs cannot grant or alter membership in the wrong organization. Concurrent owner removals cannot leave zero owners or allow a previously removed actor to mutate the team. Legacy installed-client and platform-admin contracts remain valid.
