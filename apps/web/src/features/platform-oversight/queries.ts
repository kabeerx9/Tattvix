import type {
  PlatformOversightAuditQuery,
  PlatformOversightWeeklyCheckInsQuery,
} from "@tattvix/contracts";
import { queryOptions } from "@tanstack/react-query";

import { platformOversightApi } from "./api";
import { platformOversightKeys } from "./keys";

export const platformOversightQueries = {
  stays: () =>
    queryOptions({
      queryKey: platformOversightKeys.stays(),
      queryFn: () => platformOversightApi.stays(),
      staleTime: 15_000,
    }),
  audit: (query: PlatformOversightAuditQuery) =>
    queryOptions({
      queryKey: platformOversightKeys.audit(
        query.organizationSlug ?? "",
        query.action ?? "",
        query.limit ?? 50,
      ),
      queryFn: () => platformOversightApi.audit(query),
      staleTime: 15_000,
    }),
  weeklyCheckIns: (query: PlatformOversightWeeklyCheckInsQuery) =>
    queryOptions({
      queryKey: platformOversightKeys.weeklyCheckIns(query.weeks ?? 8),
      queryFn: () => platformOversightApi.weeklyCheckIns(query),
      staleTime: 15_000,
    }),
};
