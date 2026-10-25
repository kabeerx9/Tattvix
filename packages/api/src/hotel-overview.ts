import { queryOptions } from "@tanstack/react-query";
import { hotelOverviewSummaryResponseSchema, type ApiClient } from "@tattvix/contracts";

export const hotelOverviewKeys = {
  all: ["hotel-overview"] as const,
  property: (organizationSlug: string, propertySlug: string) =>
    [...hotelOverviewKeys.all, organizationSlug, propertySlug] as const,
  summary: (organizationSlug: string, propertySlug: string, days: number) =>
    [...hotelOverviewKeys.property(organizationSlug, propertySlug), "summary", days] as const,
};

export function createHotelOverviewApi(client: ApiClient) {
  return {
    summary(organizationSlug: string, propertySlug: string, days: number) {
      return client.requestJson(
        `/api/hotel/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(propertySlug)}/overview/?days=${days}`,
        hotelOverviewSummaryResponseSchema,
      );
    },
  };
}
export type HotelOverviewApi = ReturnType<typeof createHotelOverviewApi>;

export function createHotelOverviewQueries(api: HotelOverviewApi) {
  return {
    summary: (organizationSlug: string, propertySlug: string, days = 7) =>
      queryOptions({
        queryKey: hotelOverviewKeys.summary(organizationSlug, propertySlug, days),
        queryFn: () => api.summary(organizationSlug, propertySlug, days),
        staleTime: 60_000,
      }),
  };
}
