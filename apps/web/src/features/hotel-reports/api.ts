import {
  hotelReportInHouseResponseSchema,
  hotelReportOccupancyResponseSchema,
  hotelReportRegisterResponseSchema,
  hotelReportStatusCountsResponseSchema,
  type HotelReportDateRangeQuery,
} from "@tattvix/contracts";

import { apiClient } from "@/lib/api";

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

export const hotelReportsApi = {
  register(
    organizationSlug: string,
    propertySlug: string,
    range: HotelReportDateRangeQuery,
  ) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/reports/register/${dateRangeQuery(range)}`,
      hotelReportRegisterResponseSchema,
    );
  },
  inHouse(organizationSlug: string, propertySlug: string) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/reports/in-house/`,
      hotelReportInHouseResponseSchema,
    );
  },
  occupancy(organizationSlug: string, propertySlug: string) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/reports/occupancy/`,
      hotelReportOccupancyResponseSchema,
    );
  },
  statusCounts(
    organizationSlug: string,
    propertySlug: string,
    range: HotelReportDateRangeQuery,
  ) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/reports/status-counts/${dateRangeQuery(range)}`,
      hotelReportStatusCountsResponseSchema,
    );
  },
  async downloadRegisterCsv(
    organizationSlug: string,
    propertySlug: string,
    range: HotelReportDateRangeQuery,
  ) {
    const params = new URLSearchParams();
    if (range.dateFrom) params.set("dateFrom", range.dateFrom);
    if (range.dateTo) params.set("dateTo", range.dateTo);
    params.set("export", "csv");
    return apiClient.requestBlob(
      `${propertyBase(organizationSlug, propertySlug)}/reports/register/?${params.toString()}`,
    );
  },
};
