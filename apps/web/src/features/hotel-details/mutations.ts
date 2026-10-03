import type { PropertyDetailsInput } from "@tattvix/contracts";
import type { QueryClient } from "@tanstack/react-query";

import { hotelDetailsApi } from "./api";
import { hotelDetailsKeys } from "./keys";

export const hotelDetailsMutations = {
  update: (queryClient: QueryClient) => ({
    mutationFn: ({
      organizationSlug,
      propertySlug,
      input,
    }: {
      organizationSlug: string;
      propertySlug: string;
      input: PropertyDetailsInput;
    }) => hotelDetailsApi.update(organizationSlug, propertySlug, input),
    onSuccess: (
      _details: unknown,
      variables: { organizationSlug: string; propertySlug: string },
    ) =>
      queryClient.invalidateQueries({
        queryKey: hotelDetailsKeys.property(
          variables.organizationSlug,
          variables.propertySlug,
        ),
      }),
  }),
};
