import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  teamAddInputSchema, teamUpdateInputSchema, teamSearchInputSchema, teamListResponseSchema,
  teamMemberSchema, teamUserSearchResponseSchema,
  type ApiClient, type TeamAddInput, type TeamUpdateInput, type TeamMember, type MeResponse,
} from "@tattvix/contracts";

export const teamKeys = {
  all: ["team"] as const,
  organization: (org: string) => ["team", org] as const,
  list: (org: string) => ["team", org, "list"] as const,
  search: (org: string, email: string) => ["team", org, "users", email.trim().toLowerCase()] as const,
};
export function createTeamApi(client: ApiClient) {
  const base = (org: string) => `/api/hotel/${encodeURIComponent(org)}/team/`;
  return {
    list: (org: string) => client.requestJson(base(org), teamListResponseSchema),
    searchUsers: (org: string, email: string) => {
      const input = teamSearchInputSchema.parse({ email });
      return client.requestJson(`${base(org)}users/?${new URLSearchParams(input)}`, teamUserSearchResponseSchema);
    },
    add: (org: string, input: TeamAddInput) => client.requestJson(base(org), teamMemberSchema, { method: "POST", body: JSON.stringify(teamAddInputSchema.parse(input)) }),
    update: (org: string, memberId: number, input: TeamUpdateInput) => client.requestJson(`${base(org)}${memberId}/`, teamMemberSchema, { method: "PATCH", body: JSON.stringify(teamUpdateInputSchema.parse(input)) }),
  };
}
export type TeamApi = ReturnType<typeof createTeamApi>;
export function createTeamQueries(api: TeamApi) {
  return {
    list: (org: string) => queryOptions({
      queryKey: teamKeys.list(org),
      queryFn: async ({ client }) => {
        const data = await api.list(org);
        // The server's latest subscription snapshot also drives workspace
        // banners; don't leave a stale "Free trial" beside an expired team.
        client.setQueriesData<MeResponse>({ queryKey: ["current-user"] }, (user) => {
          if (!user?.memberships) return user;
          const current = user.memberships.find((m) => m.organization.slug === org);
          if (!current || JSON.stringify(current.subscription) === JSON.stringify(data.subscription)) return user;
          return { ...user, memberships: user.memberships.map((m) => m.organization.slug === org ? { ...m, subscription: data.subscription } : m) };
        });
        return data;
      },
      staleTime: 10_000,
    }),
    search: (org: string, email: string) => queryOptions({
      queryKey: teamKeys.search(org, email), queryFn: () => api.searchUsers(org, email),
      enabled: teamSearchInputSchema.safeParse({ email }).success, staleTime: 0, gcTime: 0,
    }),
  };
}
export function createTeamMutations(api: TeamApi, queryClient: QueryClient, org: string) {
  const onSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: ["current-user"] });
    const accounts = queryClient.getQueriesData<Pick<MeResponse, "memberships">>({ queryKey: ["current-user"] }).map(([,user]) => user).filter((user) => Array.isArray(user?.memberships));
    if (accounts.length && !accounts.some((user) => user?.memberships.some((m) => m.organization.slug === org && m.permissions.includes("members:manage")))) {
      clearTeamAccessCaches(queryClient, org);
      return;
    }
    // Permission changes make old operational caches unsafe to retain. Remove
    // inactive ones; active routes are guarded by the refreshed /me response.
    queryClient.removeQueries({ type: "inactive", predicate: (q) => /^(hotel-|check-in|guest-stay)/.test(String(q.queryKey[0])) });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: teamKeys.organization(org) }),
      queryClient.invalidateQueries({ queryKey: ["platform-organizations"] }),
      queryClient.invalidateQueries({ queryKey: ["platform-portfolio"] }),
    ]);
  };
  return {
    add: { mutationFn: (input: TeamAddInput) => api.add(org, input), onSuccess },
    update: { mutationFn: ({ memberId, input }: { memberId: number; input: TeamUpdateInput }) => api.update(org, memberId, input), onSuccess },
  };
}
export function clearTeamAccessCaches(queryClient: QueryClient, org: string) {
  queryClient.removeQueries({ predicate: (query) => {
    const root = String(query.queryKey[0]);
    return (root === "team" && query.queryKey[1] === org) || /^(hotel-|check-in|guest-stay)/.test(root);
  } });
}
export async function refreshLostTeamAccess(queryClient: QueryClient, org: string) {
  await queryClient.invalidateQueries({ queryKey: ["current-user"] });
  clearTeamAccessCaches(queryClient, org);
}
export const teamRoleLabels = { OWNER: "Owner", MANAGER: "Manager", RECEPTION: "Reception" } as const;
export function teamMemberName(member: Pick<TeamMember, "user">) {
  return [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") || member.user.email;
}
export type TeamRole = TeamMember["role"];
export function propertiesForRole(role: TeamRole, propertyIds: number[]) {
  return role === "OWNER" ? [] : propertyIds;
}
export function canSaveTeamMember(role: TeamRole, propertyIds: number[], hasSelectedUser = true) {
  return hasSelectedUser && teamAddInputSchema.safeParse({ userId: 1, role, propertyIds: propertiesForRole(role, propertyIds) }).success;
}
export function propertyScopeLabel(member: Pick<TeamMember, "hasAllProperties" | "propertyIds">, namesById: Map<number, string>) {
  if (member.hasAllProperties) return "All properties, including future properties";
  const names = member.propertyIds.map((id) => namesById.get(id)).filter((name): name is string => Boolean(name));
  const otherCount = member.propertyIds.length - names.length;
  if (otherCount) names.push(`${otherCount} other assigned ${otherCount === 1 ? "property" : "properties"}`);
  return names.length ? names.join(", ") : "No properties selected";
}
