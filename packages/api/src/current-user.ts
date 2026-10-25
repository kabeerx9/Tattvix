import { queryOptions } from "@tanstack/react-query";
import { meResponseSchema, type ApiClient } from "@tattvix/contracts";

export const currentUserKeys = {
  all: ["current-user"] as const,
  detail: (clerkUserId: string) => [...currentUserKeys.all, clerkUserId] as const,
};

export function createCurrentUserApi(client: ApiClient) {
  return {
    getMe() {
      return client.requestJson("/api/me/", meResponseSchema);
    },
  };
}
export type CurrentUserApi = ReturnType<typeof createCurrentUserApi>;

export function createCurrentUserQueries(api: CurrentUserApi) {
  return {
    detail: (clerkUserId: string) =>
      queryOptions({
        queryKey: currentUserKeys.detail(clerkUserId),
        queryFn: () => api.getMe(),
        staleTime: 60_000,
      }),
  };
}
