import type { HotelReportDateRangeQuery } from "@tattvix/contracts";

export const hotelReportsKeys = {
  all: ["hotel-reports"] as const,
  property: (organizationSlug: string, propertySlug: string) =>
    [...hotelReportsKeys.all, organizationSlug, propertySlug] as const,
  register: (
    organizationSlug: string,
    propertySlug: string,
    range: HotelReportDateRangeQuery,
  ) =>
    [
      ...hotelReportsKeys.property(organizationSlug, propertySlug),
      "register",
      range,
    ] as const,
  inHouse: (organizationSlug: string, propertySlug: string) =>
    [
      ...hotelReportsKeys.property(organizationSlug, propertySlug),
      "in-house",
    ] as const,
  occupancy: (organizationSlug: string, propertySlug: string) =>
    [
      ...hotelReportsKeys.property(organizationSlug, propertySlug),
      "occupancy",
    ] as const,
  statusCounts: (
    organizationSlug: string,
    propertySlug: string,
    range: HotelReportDateRangeQuery,
  ) =>
    [
      ...hotelReportsKeys.property(organizationSlug, propertySlug),
      "status-counts",
      range,
    ] as const,
};
