import { classifyApiError } from "@tattvix/api";

export { canSaveTeamMember, propertiesForRole, propertyScopeLabel, type TeamRole } from "@tattvix/api";

/** Team authorization is intentionally masked as 404 by the owner API. */
export function isLostTeamAccess(error: unknown) {
  const failure = classifyApiError(error);
  return failure.kind === "forbidden" || failure.kind === "missing";
}
