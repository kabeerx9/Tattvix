export const hotelDetailsKeys = {
  all: ["hotel-details"] as const,
  property: (organizationSlug: string, propertySlug: string) =>
    [...hotelDetailsKeys.all, organizationSlug, propertySlug] as const,
};
