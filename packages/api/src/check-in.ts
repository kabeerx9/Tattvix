import { queryOptions } from "@tanstack/react-query";
import {
  checkInContextSchema,
  guestShareListResponseSchema,
  guestStaySchema,
  type ApiClient,
  type GuestCheckInSubmitInput,
} from "@tattvix/contracts";

export const checkInKeys = {
  all: ["check-in"] as const,
  context: (token: string) => [...checkInKeys.all, "context", token] as const,
  shares: () => [...checkInKeys.all, "shares"] as const,
};

export function createCheckInApi(client: ApiClient) {
  return {
    listShares() {
      return client.requestJson("/api/guest/stays/", guestShareListResponseSchema);
    },
    getContext(token: string) {
      return client.requestJson(`/api/check-in/${encodeURIComponent(token)}/`, checkInContextSchema);
    },
    submit(token: string, input: GuestCheckInSubmitInput) {
      return client.requestJson(`/api/check-in/${encodeURIComponent(token)}/submit/`, guestStaySchema, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    revoke(stayId: string) {
      return client.requestJson(`/api/guest/stays/${stayId}/revoke/`, guestStaySchema, { method: "POST" });
    },
  };
}
export type CheckInApi = ReturnType<typeof createCheckInApi>;

export function createCheckInQueries(api: CheckInApi) {
  return {
    shares: () =>
      queryOptions({
        queryKey: checkInKeys.shares(),
        queryFn: api.listShares,
        staleTime: 30_000,
      }),
    context: (token: string) =>
      queryOptions({
        queryKey: checkInKeys.context(token),
        queryFn: () => api.getContext(token),
        staleTime: 30_000,
      }),
  };
}
