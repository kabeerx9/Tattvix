import type { HotelRegistrationInput, HotelRegistrationReviewInput } from "@tattvix/contracts";
import type { QueryClient } from "@tanstack/react-query";

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hotelRegistrationKeys.all }),
  }),
};
