import {
  hotelRegistrationListResponseSchema,
  hotelRegistrationRequestSchema,
  platformHotelRegistrationListResponseSchema,
  platformHotelRegistrationRequestSchema,
  type HotelRegistrationInput,
  type HotelRegistrationReviewInput,
  type HotelRegistrationStatus,
} from "@tattvix/contracts";

import { apiClient } from "@/lib/api";

export const hotelRegistrationApi = {
  listGuestRequests() {
    return apiClient.requestJson(
      "/api/guest/hotel-requests/",
      hotelRegistrationListResponseSchema,
    );
  },
  submitRequest(input: HotelRegistrationInput) {
    return apiClient.requestJson(
      "/api/guest/hotel-requests/",
      hotelRegistrationRequestSchema,
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  listAdminRequests(status: HotelRegistrationStatus) {
    return apiClient.requestJson(
      `/api/platform/hotel-requests/?status=${encodeURIComponent(status)}`,
      platformHotelRegistrationListResponseSchema,
    );
  },
  reviewRequest(id: number, input: HotelRegistrationReviewInput) {
    return apiClient.requestJson(
      `/api/platform/hotel-requests/${id}/review/`,
      platformHotelRegistrationRequestSchema,
      { method: "POST", body: JSON.stringify(input) },
    );
  },
};
