import { queryOptions } from "@tanstack/react-query";
import type { IdentityDocumentImageSide } from "@tattvix/contracts";

import { hotelStaysApi } from "./api";
import { hotelStayKeys } from "./keys";

export const hotelStayQueries = {
  list: (organizationSlug: string, propertySlug: string) =>
    queryOptions({
      queryKey: hotelStayKeys.list(organizationSlug, propertySlug),
      queryFn: () => hotelStaysApi.list(organizationSlug, propertySlug),
      staleTime: 30_000,
    }),
  detail: (
    organizationSlug: string,
    propertySlug: string,
    stayId: string,
  ) =>
    queryOptions({
      queryKey: hotelStayKeys.detail(
        organizationSlug,
        propertySlug,
        stayId,
      ),
      queryFn: () =>
        hotelStaysApi.get(organizationSlug, propertySlug, stayId),
      staleTime: 10_000,
    }),
  imageAccess: (
    organizationSlug: string,
    propertySlug: string,
    stayId: string,
    side: IdentityDocumentImageSide,
  ) =>
    queryOptions({
      queryKey: hotelStayKeys.image(
        organizationSlug,
        propertySlug,
        stayId,
        side,
      ),
      queryFn: () =>
        hotelStaysApi.getImageAccess(
          organizationSlug,
          propertySlug,
          stayId,
          side,
        ),
      staleTime: 60_000,
      gcTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
    }),
};
