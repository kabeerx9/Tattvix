import {
  companionProfileListResponseSchema,
  companionProfileSchema,
  type CompanionProfileInput,
} from "@tattvix/contracts";

import { apiClient } from "@/lib/api";

export const companionsApi = {
  list() {
    return apiClient.requestJson(
      "/api/guest/companions/",
      companionProfileListResponseSchema,
    );
  },
  create(input: CompanionProfileInput) {
    return apiClient.requestJson(
      "/api/guest/companions/",
      companionProfileSchema,
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  update(id: number, input: CompanionProfileInput) {
    return apiClient.requestJson(
      `/api/guest/companions/${id}/`,
      companionProfileSchema,
      { method: "PUT", body: JSON.stringify(input) },
    );
  },
  remove(id: number) {
    return apiClient.requestVoid(`/api/guest/companions/${id}/`, {
      method: "DELETE",
    });
  },
};
