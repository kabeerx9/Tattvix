import { queryOptions } from "@tanstack/react-query";

import { platformOrganizationsApi } from "./api";
import { platformOrganizationKeys } from "./keys";

export const platformOrganizationQueries = {
  list: () =>
    queryOptions({
      queryKey: platformOrganizationKeys.list(),
      queryFn: () => platformOrganizationsApi.list(),
      staleTime: 30_000,
    }),
  detail: (organizationSlug: string) =>
    queryOptions({
      queryKey: platformOrganizationKeys.detail(organizationSlug),
      queryFn: () => platformOrganizationsApi.detail(organizationSlug),
      staleTime: 15_000,
    }),
};
