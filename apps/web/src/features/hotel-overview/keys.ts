export const hotelOverviewKeys = {
  all: ["hotel-overview"] as const,
  property: (organizationSlug: string, propertySlug: string) =>
    [...hotelOverviewKeys.all, organizationSlug, propertySlug] as const,
  summary: (organizationSlug: string, propertySlug: string, days: number) =>
    [...hotelOverviewKeys.property(organizationSlug, propertySlug), "summary", days] as const,
};
