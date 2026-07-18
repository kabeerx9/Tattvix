import type { QueryClient } from "@tanstack/react-query";

import { hotelStaysApi } from "./api";
import { hotelStayKeys } from "./keys";

type StayScope = {
  organizationSlug: string;
  propertySlug: string;
  stayId: string;
};

export const hotelStayMutations = {
  generateQr: () => ({
    mutationFn: ({
      organizationSlug,
      propertySlug,
    }: Omit<StayScope, "stayId">) =>
      hotelStaysApi.generateQr(organizationSlug, propertySlug),
  }),
  close: (queryClient: QueryClient) => ({
    mutationFn: ({
      organizationSlug,
      propertySlug,
      stayId,
    }: StayScope) =>
      hotelStaysApi.close(organizationSlug, propertySlug, stayId),
    onSuccess: (_stay: unknown, variables: StayScope) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: hotelStayKeys.list(
            variables.organizationSlug,
            variables.propertySlug,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: hotelStayKeys.detail(
            variables.organizationSlug,
            variables.propertySlug,
            variables.stayId,
          ),
        }),
      ]),
  }),
};
