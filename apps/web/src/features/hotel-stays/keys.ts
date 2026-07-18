export const hotelStayKeys = {
  all: ["hotel-stays"] as const,
  property: (organizationSlug: string, propertySlug: string) =>
    [...hotelStayKeys.all, organizationSlug, propertySlug] as const,
  list: (organizationSlug: string, propertySlug: string) =>
    [...hotelStayKeys.property(organizationSlug, propertySlug), "list"] as const,
  detail: (
    organizationSlug: string,
    propertySlug: string,
    stayId: string,
  ) =>
    [
      ...hotelStayKeys.property(organizationSlug, propertySlug),
      "detail",
      stayId,
    ] as const,
  image: (
    organizationSlug: string,
    propertySlug: string,
    stayId: string,
    side: string,
  ) =>
    [
      ...hotelStayKeys.detail(organizationSlug, propertySlug, stayId),
      "image",
      side,
    ] as const,
};
