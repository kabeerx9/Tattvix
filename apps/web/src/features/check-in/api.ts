import {
  checkInContextSchema,
  guestShareListResponseSchema,
  guestStaySchema,
  type GuestCheckInSubmitInput,
} from "@tattvix/contracts";

import { apiClient } from "@/lib/api";

export const checkInApi = {
  listShares() {
    return apiClient.requestJson(
      "/api/guest/stays/",
      guestShareListResponseSchema,
    );
  },
  getContext(token: string) {
    return apiClient.requestJson(
      `/api/check-in/${encodeURIComponent(token)}/`,
      checkInContextSchema,
    );
  },
  submit(token: string, input: GuestCheckInSubmitInput) {
    return apiClient.requestJson(
      `/api/check-in/${encodeURIComponent(token)}/submit/`,
      guestStaySchema,
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  revoke(stayId: string) {
    return apiClient.requestJson(
      `/api/guest/stays/${stayId}/revoke/`,
      guestStaySchema,
      { method: "POST" },
    );
  },
};
