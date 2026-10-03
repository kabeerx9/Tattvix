import type { HotelRegistrationStatus } from "@tattvix/contracts";
import { queryOptions } from "@tanstack/react-query";

import { hotelRegistrationApi } from "./api";
import { hotelRegistrationKeys } from "./keys";
import { hasPendingHotelRequest } from "./status";

export const hotelRegistrationQueries = {
  guest: () =>
    queryOptions({
      queryKey: hotelRegistrationKeys.guest(),
      queryFn: () => hotelRegistrationApi.listGuestRequests(),
      staleTime: 10_000,
      refetchInterval: (query) =>
        hasPendingHotelRequest(query.state.data?.requests ?? []) ? 15_000 : false,
    }),
  admin: (status: HotelRegistrationStatus) =>
    queryOptions({
      queryKey: hotelRegistrationKeys.admin(status),
      queryFn: () => hotelRegistrationApi.listAdminRequests(status),
      staleTime: 10_000,
      refetchInterval: status === "PENDING" ? 15_000 : false,
    }),
};
