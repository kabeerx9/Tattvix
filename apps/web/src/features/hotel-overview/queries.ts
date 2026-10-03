import { queryOptions } from "@tanstack/react-query";

import { hotelOverviewApi } from "./api";
import { hotelOverviewKeys } from "./keys";

export const hotelOverviewQueries = {
  summary: (organizationSlug: string, propertySlug: string, days = 7) =>
    queryOptions({
      queryKey: hotelOverviewKeys.summary(organizationSlug, propertySlug, days),
      queryFn: () => hotelOverviewApi.summary(organizationSlug, propertySlug, days),
      staleTime: 60_000,
    }),
};
