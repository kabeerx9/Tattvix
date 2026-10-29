import { queryOptions } from "@tanstack/react-query";
import { platformPortfolioResponseSchema, type ApiClient } from "@tattvix/contracts";

export const platformPortfolioKeys = {
  all: ["platform-portfolio"] as const,
  list: (organizationSlug?: string, includeContacts = false) => [...platformPortfolioKeys.all, organizationSlug ?? "all", includeContacts] as const,
};

export function createPlatformPortfolioApi(client: ApiClient) {
  return {
    list(organizationSlug?: string, includeContacts = false) {
      const params = new URLSearchParams();
      if (organizationSlug) params.set("organization", organizationSlug);
      if (includeContacts) params.set("includeContacts", "true");
      // Not `params.size`: React Native's URLSearchParams lacks it, which silently dropped the filter.
      const query = params.toString() ? `?${params}` : "";
      return client.requestJson(`/api/platform/portfolio/${query}`, platformPortfolioResponseSchema);
    },
  };
}
export type PlatformPortfolioApi = ReturnType<typeof createPlatformPortfolioApi>;

export function createPlatformPortfolioQueries(api: PlatformPortfolioApi, { includeContacts = false } = {}) {
  return {
    list: (organizationSlug?: string) =>
      queryOptions({
        queryKey: platformPortfolioKeys.list(organizationSlug, includeContacts),
        queryFn: () => api.list(organizationSlug, includeContacts),
        // Photo URLs are presigned; refetching well inside their TTL keeps them valid.
        staleTime: 30_000,
      }),
  };
}
