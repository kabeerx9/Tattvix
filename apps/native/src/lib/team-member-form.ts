import { classifyApiError, type TeamRole } from "@tattvix/api";
import type { TeamUpdateInput } from "@tattvix/contracts";

export { canSaveTeamMember, propertiesForRole, propertyScopeLabel, type TeamRole } from "@tattvix/api";

/** Team authorization is intentionally masked as 404 by the owner API. */
export function isLostTeamAccess(error: unknown) {
  const failure = classifyApiError(error);
  return failure.kind === "forbidden" || failure.kind === "missing";
}

/** Only explicit form edits become PATCH fields, so stale form state cannot overwrite a concurrent role change. */
export function buildTeamMemberPatch({ role, propertyIds, roleChanged, propertyScopeChanged }: { role: TeamRole; propertyIds: number[]; roleChanged: boolean; propertyScopeChanged: boolean }): TeamUpdateInput {
  if (roleChanged) return { role, propertyIds };
  return propertyScopeChanged ? { propertyIds } : {} as TeamUpdateInput;
}
