import { queryOptions } from "@tanstack/react-query";
import {
  hotelReportInHouseResponseSchema,
  hotelReportOccupancyResponseSchema,
  hotelReportRegisterResponseSchema,
  hotelReportStatusCountsResponseSchema,
  type ApiClient,
  type HotelReportDateRangeQuery,
} from "@tattvix/contracts";

export const hotelReportsKeys = {
  all: ["hotel-reports"] as const,
  property: (organizationSlug: string, propertySlug: string) =>
    [...hotelReportsKeys.all, organizationSlug, propertySlug] as const,
  register: (organizationSlug: string, propertySlug: string, range: HotelReportDateRangeQuery) =>
    [...hotelReportsKeys.property(organizationSlug, propertySlug), "register", range] as const,
  inHouse: (organizationSlug: string, propertySlug: string) =>
    [...hotelReportsKeys.property(organizationSlug, propertySlug), "in-house"] as const,
  occupancy: (organizationSlug: string, propertySlug: string) =>
    [...hotelReportsKeys.property(organizationSlug, propertySlug), "occupancy"] as const,
  statusCounts: (organizationSlug: string, propertySlug: string, range: HotelReportDateRangeQuery) =>
    [...hotelReportsKeys.property(organizationSlug, propertySlug), "status-counts", range] as const,
};

function propertyBase(organizationSlug: string, propertySlug: string) {
  return `/api/hotel/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(propertySlug)}`;
}

function dateRangeQuery(range: HotelReportDateRangeQuery) {
  const params = new URLSearchParams();
  if (range.dateFrom) params.set("dateFrom", range.dateFrom);
  if (range.dateTo) params.set("dateTo", range.dateTo);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function createHotelReportsApi(client: ApiClient) {
  return {
    register(organizationSlug: string, propertySlug: string, range: HotelReportDateRangeQuery) {
      return client.requestJson(
        `${propertyBase(organizationSlug, propertySlug)}/reports/register/${dateRangeQuery(range)}`,
        hotelReportRegisterResponseSchema,
      );
    },
    inHouse(organizationSlug: string, propertySlug: string) {
      return client.requestJson(
        `${propertyBase(organizationSlug, propertySlug)}/reports/in-house/`,
        hotelReportInHouseResponseSchema,
      );
    },
    occupancy(organizationSlug: string, propertySlug: string) {
      return client.requestJson(
        `${propertyBase(organizationSlug, propertySlug)}/reports/occupancy/`,
        hotelReportOccupancyResponseSchema,
      );
    },
    statusCounts(organizationSlug: string, propertySlug: string, range: HotelReportDateRangeQuery) {
      return client.requestJson(
        `${propertyBase(organizationSlug, propertySlug)}/reports/status-counts/${dateRangeQuery(range)}`,
        hotelReportStatusCountsResponseSchema,
      );
    },
    async downloadRegisterCsv(organizationSlug: string, propertySlug: string, range: HotelReportDateRangeQuery) {
      const params = new URLSearchParams();
      if (range.dateFrom) params.set("dateFrom", range.dateFrom);
      if (range.dateTo) params.set("dateTo", range.dateTo);
      params.set("export", "csv");
      return client.requestBlob(
        `${propertyBase(organizationSlug, propertySlug)}/reports/register/?${params.toString()}`,
      );
    },
  };
}
export type HotelReportsApi = ReturnType<typeof createHotelReportsApi>;

export function createHotelReportsQueries(api: HotelReportsApi) {
  return {
    register: (organizationSlug: string, propertySlug: string, range: HotelReportDateRangeQuery) =>
      queryOptions({
        queryKey: hotelReportsKeys.register(organizationSlug, propertySlug, range),
        queryFn: () => api.register(organizationSlug, propertySlug, range),
        staleTime: 15_000,
      }),
    inHouse: (organizationSlug: string, propertySlug: string) =>
      queryOptions({
        queryKey: hotelReportsKeys.inHouse(organizationSlug, propertySlug),
        queryFn: () => api.inHouse(organizationSlug, propertySlug),
        staleTime: 15_000,
      }),
    occupancy: (organizationSlug: string, propertySlug: string) =>
      queryOptions({
        queryKey: hotelReportsKeys.occupancy(organizationSlug, propertySlug),
        queryFn: () => api.occupancy(organizationSlug, propertySlug),
        staleTime: 15_000,
      }),
    statusCounts: (organizationSlug: string, propertySlug: string, range: HotelReportDateRangeQuery) =>
      queryOptions({
        queryKey: hotelReportsKeys.statusCounts(organizationSlug, propertySlug, range),
        queryFn: () => api.statusCounts(organizationSlug, propertySlug, range),
        staleTime: 15_000,
      }),
  };
}
