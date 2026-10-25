import { queryOptions } from "@tanstack/react-query";
import {
  hotelRegistrationListResponseSchema,
  hotelRegistrationRequestSchema,
  platformHotelRegistrationListResponseSchema,
  platformHotelRegistrationRequestSchema,
  type ApiClient,
  type HotelRegistrationInput,
  type HotelRegistrationRequest,
  type HotelRegistrationReviewInput,
  type HotelRegistrationStatus,
} from "@tattvix/contracts";

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
