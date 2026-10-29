import { queryOptions } from "@tanstack/react-query";
import { meResponseSchema, type ApiClient } from "@tattvix/contracts";

import { classifyApiError } from "./errors";

export const currentUserKeys = {
  all: ["current-user"] as const,
  detail: (clerkUserId: string) => [...currentUserKeys.all, clerkUserId] as const,
};

export function createCurrentUserApi(client: ApiClient) {
  return {
    getMe() {
      return client.requestJson("/api/me/", meResponseSchema);
    },
    /**
     * Deletes the signed-in person's account: their profile, companions and
     * identity documents go, their Clerk user is removed, and the server keeps
     * only the anonymised record hotels need for their guest register.
     * Resolves on 204; rejects with ApiError 409 `owner_has_hotel` or 503
     * `storage_unavailable` (nothing changed in either case).
     */
    deleteAccount() {
      return client.requestVoid("/api/me/", { method: "DELETE" });
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

/**
 * What to tell the person when deleting their account failed. The server's
 * own words for a refusal (an owner still holding a hotel) or an outage;
 * a generic line for anything else so no raw status leaks into the UI.
 */
export function describeAccountDeletionFailure(error: unknown): string {
  const failure = classifyApiError(error);
  if (failure.kind === "rejected" && failure.code === "owner_has_hotel") return failure.message;
  if (failure.kind === "server" && failure.status === 503) {
    return failure.message || "Private document storage is temporarily unavailable. Nothing was deleted; try again in a few minutes.";
  }
  if (failure.kind === "network") return failure.message;
  return "Your account could not be deleted right now. Nothing was changed; try again in a few minutes.";
}
