import { queryOptions } from "@tanstack/react-query";
import { platformPortfolioResponseSchema, type ApiClient } from "@tattvix/contracts";

export const platformPortfolioKeys = {
  all: ["platform-portfolio"] as const,
  list: (organizationSlug?: string) => [...platformPortfolioKeys.all, organizationSlug ?? "all"] as const,
};

export function createPlatformPortfolioApi(client: ApiClient) {
  return {
    list(organizationSlug?: string) {
      const query = organizationSlug ? `?${new URLSearchParams({ organization: organizationSlug })}` : "";
      return client.requestJson(`/api/platform/portfolio/${query}`, platformPortfolioResponseSchema);
    },
  };
}
export type PlatformPortfolioApi = ReturnType<typeof createPlatformPortfolioApi>;

export function createPlatformPortfolioQueries(api: PlatformPortfolioApi) {
  return {
    list: (organizationSlug?: string) =>
      queryOptions({
        queryKey: platformPortfolioKeys.list(organizationSlug),
        queryFn: () => api.list(organizationSlug),
        // Photo URLs are presigned; refetching well inside their TTL keeps them valid.
        staleTime: 30_000,
      }),
  };
}
