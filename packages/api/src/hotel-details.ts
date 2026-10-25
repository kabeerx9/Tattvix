import { queryOptions } from "@tanstack/react-query";
import {
  propertyDetailsSchema,
  type ApiClient,
  type PropertyDetailsInput,
} from "@tattvix/contracts";

export const hotelDetailsKeys = {
  all: ["hotel-details"] as const,
  property: (organizationSlug: string, propertySlug: string) =>
    [...hotelDetailsKeys.all, organizationSlug, propertySlug] as const,
};

function propertyBase(organizationSlug: string, propertySlug: string) {
  return `/api/hotel/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(propertySlug)}`;
}

export function createHotelDetailsApi(client: ApiClient) {
  return {
    get(organizationSlug: string, propertySlug: string) {
      return client.requestJson(`${propertyBase(organizationSlug, propertySlug)}/details/`, propertyDetailsSchema);
    },
    update(organizationSlug: string, propertySlug: string, input: PropertyDetailsInput) {
      return client.requestJson(`${propertyBase(organizationSlug, propertySlug)}/details/`, propertyDetailsSchema, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
  };
}
export type HotelDetailsApi = ReturnType<typeof createHotelDetailsApi>;

export function createHotelDetailsQueries(api: HotelDetailsApi) {
  return {
    property: (organizationSlug: string, propertySlug: string) =>
      queryOptions({
        queryKey: hotelDetailsKeys.property(organizationSlug, propertySlug),
        queryFn: () => api.get(organizationSlug, propertySlug),
        staleTime: 30_000,
      }),
  };
}
