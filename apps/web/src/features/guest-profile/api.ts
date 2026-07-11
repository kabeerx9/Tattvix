import {
  guestProfileResponseSchema,
  type GuestProfileInput,
} from "@tattvix/contracts";

import { apiClient } from "@/lib/api";

export const guestProfileApi = {
  get() {
    return apiClient.requestJson(
      "/api/guest/profile/",
      guestProfileResponseSchema,
    );
  },
  update(input: GuestProfileInput) {
    return apiClient.requestJson(
      "/api/guest/profile/",
      guestProfileResponseSchema,
      { method: "PUT", body: JSON.stringify(input) },
    );
  },
};
