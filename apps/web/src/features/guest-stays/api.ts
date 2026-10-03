import { guestShareSchema, stayBillSchema } from "@tattvix/contracts";
import { apiClient } from "@/lib/api";
export const guestStaysApi = {
  detail: (stayId: string) =>
    apiClient.requestJson(
      `/api/guest/stays/${encodeURIComponent(stayId)}/`,
      guestShareSchema,
    ),
  bill: (stayId: string) =>
    apiClient.requestJson(
      `/api/guest/stays/${encodeURIComponent(stayId)}/bill/`,
      stayBillSchema,
    ),
};
