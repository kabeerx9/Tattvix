import { queryOptions } from "@tanstack/react-query";
import {
  platformOversightAuditResponseSchema,
  platformOversightStaysResponseSchema,
  platformOversightWeeklyCheckInsResponseSchema,
  type ApiClient,
  type PlatformOversightAuditQuery,
  type PlatformOversightWeeklyCheckInsQuery,
} from "@tattvix/contracts";

export const platformOversightKeys = {
  all: ["platform-oversight"] as const,
  stays: () => [...platformOversightKeys.all, "stays"] as const,
  audit: (organizationSlug: string, action: string, limit: number) =>
    [...platformOversightKeys.all, "audit", organizationSlug, action, limit] as const,
  weeklyCheckIns: (weeks: number) => [...platformOversightKeys.all, "weekly-check-ins", weeks] as const,
};

export function createPlatformOversightApi(client: ApiClient) {
  return {
    stays() {
      return client.requestJson("/api/platform/oversight/stays/", platformOversightStaysResponseSchema);
    },
    audit(query: PlatformOversightAuditQuery) {
      const params = new URLSearchParams();
      if (query.organizationSlug) {
        params.set("organizationSlug", query.organizationSlug);
      }
      if (query.action) {
        params.set("action", query.action);
      }
      if (query.limit) {
        params.set("limit", String(query.limit));
      }
      const search = params.toString();
      return client.requestJson(
        `/api/platform/oversight/audit/${search ? `?${search}` : ""}`,
        platformOversightAuditResponseSchema,
      );
    },
    weeklyCheckIns(query: PlatformOversightWeeklyCheckInsQuery) {
      const params = new URLSearchParams();
      if (query.weeks) {
        params.set("weeks", String(query.weeks));
      }
      const search = params.toString();
      return client.requestJson(
        `/api/platform/oversight/weekly-check-ins/${search ? `?${search}` : ""}`,
        platformOversightWeeklyCheckInsResponseSchema,
      );
    },
  };
}
export type PlatformOversightApi = ReturnType<typeof createPlatformOversightApi>;

export function createPlatformOversightQueries(api: PlatformOversightApi) {
  return {
    stays: () =>
      queryOptions({
        queryKey: platformOversightKeys.stays(),
        queryFn: () => api.stays(),
        staleTime: 15_000,
      }),
    audit: (query: PlatformOversightAuditQuery) =>
      queryOptions({
        queryKey: platformOversightKeys.audit(query.organizationSlug ?? "", query.action ?? "", query.limit ?? 50),
        queryFn: () => api.audit(query),
        staleTime: 15_000,
      }),
    weeklyCheckIns: (query: PlatformOversightWeeklyCheckInsQuery) =>
      queryOptions({
        queryKey: platformOversightKeys.weeklyCheckIns(query.weeks ?? 8),
        queryFn: () => api.weeklyCheckIns(query),
        staleTime: 15_000,
      }),
  };
}
