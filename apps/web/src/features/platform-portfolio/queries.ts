import { queryOptions } from "@tanstack/react-query";

import { platformPortfolioApi } from "./api";

export const platformPortfolioKeys = {
  all: ["platform-portfolio"] as const,
  list: (organizationSlug?: string) =>
    [...platformPortfolioKeys.all, organizationSlug ?? "all"] as const,
};

export const platformPortfolioQueries = {
  list: (organizationSlug?: string) =>
    queryOptions({
      queryKey: platformPortfolioKeys.list(organizationSlug),
      queryFn: () => platformPortfolioApi.list(organizationSlug),
      // Photo URLs are presigned; refetching well inside their TTL keeps them valid.
      staleTime: 30_000,
    }),
};
