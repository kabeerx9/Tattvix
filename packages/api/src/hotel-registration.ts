import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  ApiError,
  hotelRegistrationListResponseSchema,
  hotelRegistrationRequestSchema,
  platformHotelRegistrationListResponseSchema,
  platformHotelRegistrationRequestSchema,
  type ApiClient,
  type HotelRegistrationInput,
  type HotelRegistrationRequest,
  type HotelRegistrationReviewInput,
  type HotelRegistrationStatus,
  type PlatformHotelRegistrationRequest,
} from "@tattvix/contracts";

import { platformOrganizationKeys } from "./platform-organizations";
import { platformPortfolioKeys } from "./platform-portfolio";

export const hotelRegistrationKeys = {
  all: ["hotel-registration"] as const,
  guest: () => [...hotelRegistrationKeys.all, "guest"] as const,
  admin: (status: HotelRegistrationStatus) => [...hotelRegistrationKeys.all, "admin", status] as const,
};

export function hasPendingHotelRequest(requests: HotelRegistrationRequest[]) {
  return requests.some((request) => request.status === "PENDING");
}

export function getLatestRejectedRequest(requests: HotelRegistrationRequest[]) {
  const latestRequest = [...requests]
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))[0];

  return latestRequest?.status === "REJECTED" ? latestRequest : undefined;
}

export function createHotelRegistrationApi(client: ApiClient) {
  return {
    listGuestRequests() {
      return client.requestJson("/api/guest/hotel-requests/", hotelRegistrationListResponseSchema);
    },
    submitRequest(input: HotelRegistrationInput) {
      return client.requestJson("/api/guest/hotel-requests/", hotelRegistrationRequestSchema, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    listAdminRequests(status: HotelRegistrationStatus) {
      return client.requestJson(
        `/api/platform/hotel-requests/?status=${encodeURIComponent(status)}`,
        platformHotelRegistrationListResponseSchema,
      );
    },
    reviewRequest(id: number, input: HotelRegistrationReviewInput) {
      return client.requestJson(`/api/platform/hotel-requests/${id}/review/`, platformHotelRegistrationRequestSchema, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
  };
}
export type HotelRegistrationApi = ReturnType<typeof createHotelRegistrationApi>;

export function createHotelRegistrationQueries(api: HotelRegistrationApi) {
  return {
    guest: () =>
      queryOptions({
        queryKey: hotelRegistrationKeys.guest(),
        queryFn: () => api.listGuestRequests(),
        staleTime: 10_000,
        refetchInterval: (query) =>
          hasPendingHotelRequest(query.state.data?.requests ?? []) ? 15_000 : false,
      }),
    admin: (status: HotelRegistrationStatus) =>
      queryOptions({
        queryKey: hotelRegistrationKeys.admin(status),
        queryFn: () => api.listAdminRequests(status),
        staleTime: 10_000,
        refetchInterval: status === "PENDING" ? 15_000 : false,
      }),
  };
}

export function createHotelRegistrationMutations(api: HotelRegistrationApi) {
  return {
    submit: (queryClient: QueryClient) => ({
      mutationFn: (input: HotelRegistrationInput) => api.submitRequest(input),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: hotelRegistrationKeys.guest() }),
      // 409: a request is already pending; the list shows it once refreshed.
      onError: (error: unknown) => {
        if (error instanceof ApiError && error.status === 409) {
          return queryClient.invalidateQueries({ queryKey: hotelRegistrationKeys.guest() });
        }
      },
    }),
    review: (queryClient: QueryClient) => ({
      mutationFn: ({ id, input }: { id: number; input: HotelRegistrationReviewInput }) => api.reviewRequest(id, input),
      // Approval creates an organization and property, so admin lists go stale too.
      onSuccess: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: hotelRegistrationKeys.all }),
          queryClient.invalidateQueries({ queryKey: platformOrganizationKeys.all }),
          queryClient.invalidateQueries({ queryKey: platformPortfolioKeys.all }),
        ]),
    }),
  };
}

/** First and last name, or "Unnamed applicant" when the account has no name. */
export function applicantName(request: Pick<PlatformHotelRegistrationRequest, "applicant">) {
  return [request.applicant.firstName, request.applicant.lastName].filter(Boolean).join(" ") || "Unnamed applicant";
}

export const hotelRegistrationStatusFilters: { value: HotelRegistrationStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

/** 409 means someone else reviewed it first; the caller refreshes the list instead of showing the raw error. */
export function isAlreadyReviewed(error: unknown) {
  return error instanceof ApiError && error.status === 409;
}
