import { queryOptions } from "@tanstack/react-query";

import { hotelOperationsApi } from "./api";
import { hotelOperationsKeys } from "./keys";

export const hotelOperationsQueries = {
  rooms: (organizationSlug: string, propertySlug: string) =>
    queryOptions({
      queryKey: hotelOperationsKeys.rooms(organizationSlug, propertySlug),
      queryFn: () =>
        hotelOperationsApi.listRooms(organizationSlug, propertySlug),
      staleTime: 30_000,
    }),
  guests: (organizationSlug: string, propertySlug: string) =>
    queryOptions({
      queryKey: hotelOperationsKeys.guests(organizationSlug, propertySlug),
      queryFn: () =>
        hotelOperationsApi.listGuests(organizationSlug, propertySlug),
      staleTime: 15_000,
    }),
};
