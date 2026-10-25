import { queryOptions } from "@tanstack/react-query";
import {
  guestProfileResponseSchema,
  type ApiClient,
  type GuestProfileInput,
} from "@tattvix/contracts";

export const guestProfileKeys = {
  all: ["guest-profile"] as const,
  detail: () => [...guestProfileKeys.all, "detail"] as const,
};

export function createGuestProfileApi(client: ApiClient) {
  return {
    get() {
      return client.requestJson("/api/guest/profile/", guestProfileResponseSchema);
    },
    update(input: GuestProfileInput) {
      return client.requestJson("/api/guest/profile/", guestProfileResponseSchema, {
        method: "PUT",
        body: JSON.stringify(input),
      });
    },
  };
}
export type GuestProfileApi = ReturnType<typeof createGuestProfileApi>;

export function createGuestProfileQueries(api: GuestProfileApi) {
  return {
    detail: () =>
      queryOptions({
        queryKey: guestProfileKeys.detail(),
        queryFn: api.get,
        staleTime: 60_000,
      }),
  };
}
