import { queryOptions } from "@tanstack/react-query";
import {
  guestShareSchema,
  stayBillSchema,
  type ApiClient,
} from "@tattvix/contracts";

import { checkInKeys } from "./check-in";

export function createGuestStaysApi(client: ApiClient) {
  return {
    detail: (stayId: string) =>
      client.requestJson(`/api/guest/stays/${encodeURIComponent(stayId)}/`, guestShareSchema),
    bill: (stayId: string) =>
      client.requestJson(`/api/guest/stays/${encodeURIComponent(stayId)}/bill/`, stayBillSchema),
  };
}
export type GuestStaysApi = ReturnType<typeof createGuestStaysApi>;

export function createGuestStayQueries(api: GuestStaysApi) {
  return {
    detail: (id: string) =>
      queryOptions({
        queryKey: [...checkInKeys.all, "stay", id],
        queryFn: () => api.detail(id),
        staleTime: 5000,
      }),
    bill: (id: string) =>
      queryOptions({
        queryKey: ["guest-stay-bill", id],
        queryFn: () => api.bill(id),
        staleTime: 5000,
      }),
  };
}
