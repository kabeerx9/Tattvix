import type { TeamMember } from "@tattvix/contracts";

export type TeamRole = TeamMember["role"];

export function propertiesForRole(role: TeamRole, propertyIds: number[]) {
  return role === "OWNER" ? [] : propertyIds;
}

export function canSaveTeamMember(role: TeamRole, propertyIds: number[], hasSelectedUser = true) {
  return hasSelectedUser && (role === "OWNER" || propertyIds.length > 0);
}

export function propertyScopeLabel(member: Pick<TeamMember, "role" | "hasAllProperties" | "propertyIds">, namesById: Map<number, string>) {
  if (member.hasAllProperties) return "All properties, including future properties";
  const names = member.propertyIds.map((id) => namesById.get(id)).filter((name): name is string => Boolean(name));
  return names.length ? names.join(", ") : "No properties selected";
}
