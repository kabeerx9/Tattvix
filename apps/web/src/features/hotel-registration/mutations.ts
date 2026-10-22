import type { HotelRegistrationInput, HotelRegistrationReviewInput } from "@tattvix/contracts";
import type { QueryClient } from "@tanstack/react-query";

import { platformOrganizationKeys } from "@/features/platform-organizations/keys";
import { platformPortfolioKeys } from "@/features/platform-portfolio/queries";
import { ApiError } from "@/lib/api";

import { hotelRegistrationApi } from "./api";
import { hotelRegistrationKeys } from "./keys";

export const hotelRegistrationMutations = {
  submit: (queryClient: QueryClient) => ({
    mutationFn: (input: HotelRegistrationInput) => hotelRegistrationApi.submitRequest(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hotelRegistrationKeys.guest() }),
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.status === 409) {
        return queryClient.invalidateQueries({ queryKey: hotelRegistrationKeys.guest() });
      }
    },
  }),
  review: (queryClient: QueryClient) => ({
    mutationFn: ({ id, input }: { id: number; input: HotelRegistrationReviewInput }) =>
      hotelRegistrationApi.reviewRequest(id, input),
    // Approval creates an organization and property, so admin lists go stale too.
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: hotelRegistrationKeys.all }),
      queryClient.invalidateQueries({ queryKey: platformOrganizationKeys.all }),
      queryClient.invalidateQueries({ queryKey: platformPortfolioKeys.all }),
    ]),
  }),
};
