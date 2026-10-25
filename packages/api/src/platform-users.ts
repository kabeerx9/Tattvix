import { queryOptions } from "@tanstack/react-query";
import {
  platformUserSearchResponseSchema,
  type ApiClient,
  type PlatformUserSearchParams,
} from "@tattvix/contracts";

export const platformUserKeys = {
  all: ["platform-users"] as const,
  search: (email: string) => [...platformUserKeys.all, "search", email] as const,
};

export function createPlatformUsersApi(client: ApiClient) {
  return {
    search({ email }: PlatformUserSearchParams) {
      const query = new URLSearchParams({ email });
      return client.requestJson(`/api/platform/users/?${query.toString()}`, platformUserSearchResponseSchema);
    },
  };
}
export type PlatformUsersApi = ReturnType<typeof createPlatformUsersApi>;

export function createPlatformUserQueries(api: PlatformUsersApi) {
  return {
    search: (email: string) =>
      queryOptions({
        queryKey: platformUserKeys.search(email),
        queryFn: () => api.search({ email }),
        enabled: email.length >= 3,
        staleTime: 30_000,
      }),
  };
}
