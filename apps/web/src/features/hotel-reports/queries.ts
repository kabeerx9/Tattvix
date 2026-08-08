import { queryOptions } from "@tanstack/react-query";
import type { HotelReportDateRangeQuery } from "@tattvix/contracts";

import { hotelReportsApi } from "./api";
import { hotelReportsKeys } from "./keys";

export const hotelReportsQueries = {
  register: (
    organizationSlug: string,
    propertySlug: string,
    range: HotelReportDateRangeQuery,
  ) =>
    queryOptions({
      queryKey: hotelReportsKeys.register(organizationSlug, propertySlug, range),
      queryFn: () =>
        hotelReportsApi.register(organizationSlug, propertySlug, range),
      staleTime: 15_000,
    }),
  inHouse: (organizationSlug: string, propertySlug: string) =>
    queryOptions({
      queryKey: hotelReportsKeys.inHouse(organizationSlug, propertySlug),
      queryFn: () => hotelReportsApi.inHouse(organizationSlug, propertySlug),
      staleTime: 15_000,
    }),
  occupancy: (organizationSlug: string, propertySlug: string) =>
    queryOptions({
      queryKey: hotelReportsKeys.occupancy(organizationSlug, propertySlug),
      queryFn: () => hotelReportsApi.occupancy(organizationSlug, propertySlug),
      staleTime: 15_000,
    }),
  statusCounts: (
    organizationSlug: string,
    propertySlug: string,
    range: HotelReportDateRangeQuery,
  ) =>
    queryOptions({
      queryKey: hotelReportsKeys.statusCounts(
        organizationSlug,
        propertySlug,
        range,
      ),
      queryFn: () =>
        hotelReportsApi.statusCounts(organizationSlug, propertySlug, range),
      staleTime: 15_000,
    }),
};
