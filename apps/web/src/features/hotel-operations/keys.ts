export const hotelOperationsKeys = {
  all: ["hotel-operations"] as const,
  property: (organizationSlug: string, propertySlug: string) =>
    [
      ...hotelOperationsKeys.all,
      organizationSlug,
      propertySlug,
    ] as const,
  rooms: (organizationSlug: string, propertySlug: string) =>
    [
      ...hotelOperationsKeys.property(organizationSlug, propertySlug),
      "rooms",
    ] as const,
  guests: (organizationSlug: string, propertySlug: string) =>
    [
      ...hotelOperationsKeys.property(organizationSlug, propertySlug),
      "guests",
    ] as const,
};
