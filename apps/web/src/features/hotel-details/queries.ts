import { queryOptions } from "@tanstack/react-query";

import { hotelDetailsApi } from "./api";
import { hotelDetailsKeys } from "./keys";

export const hotelDetailsQueries = {
  property: (organizationSlug: string, propertySlug: string) =>
    queryOptions({
      queryKey: hotelDetailsKeys.property(organizationSlug, propertySlug),
      queryFn: () => hotelDetailsApi.get(organizationSlug, propertySlug),
      staleTime: 30_000,
    }),
};
