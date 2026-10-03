import { hotelOverviewSummaryResponseSchema } from "@tattvix/contracts";

import { apiClient } from "@/lib/api";

export const hotelOverviewApi = {
  summary(organizationSlug: string, propertySlug: string, days: number) {
    return apiClient.requestJson(
      `/api/hotel/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(propertySlug)}/overview/?days=${days}`,
      hotelOverviewSummaryResponseSchema,
    );
  },
};
