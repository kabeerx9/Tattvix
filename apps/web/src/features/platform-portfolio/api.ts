import { platformPortfolioResponseSchema } from "@tattvix/contracts";

import { apiClient } from "@/lib/api";

export const platformPortfolioApi = {
  list(organizationSlug?: string) {
    const query = organizationSlug
      ? `?${new URLSearchParams({ organization: organizationSlug })}`
      : "";
    return apiClient.requestJson(
      `/api/platform/portfolio/${query}`,
      platformPortfolioResponseSchema,
    );
  },
};
