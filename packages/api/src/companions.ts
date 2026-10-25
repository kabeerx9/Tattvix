import { queryOptions } from "@tanstack/react-query";
import {
  companionProfileListResponseSchema,
  companionProfileSchema,
  type ApiClient,
  type CompanionProfileInput,
} from "@tattvix/contracts";

export const companionKeys = {
  all: ["companions"] as const,
  list: () => [...companionKeys.all, "list"] as const,
};

export function createCompanionsApi(client: ApiClient) {
  return {
    list() {
      return client.requestJson("/api/guest/companions/", companionProfileListResponseSchema);
    },
    create(input: CompanionProfileInput) {
      return client.requestJson("/api/guest/companions/", companionProfileSchema, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    update(id: number, input: CompanionProfileInput) {
      return client.requestJson(`/api/guest/companions/${id}/`, companionProfileSchema, {
        method: "PUT",
        body: JSON.stringify(input),
      });
    },
    remove(id: number) {
      return client.requestVoid(`/api/guest/companions/${id}/`, { method: "DELETE" });
    },
  };
}
export type CompanionsApi = ReturnType<typeof createCompanionsApi>;

export function createCompanionQueries(api: CompanionsApi) {
  return {
    list: () =>
      queryOptions({
        queryKey: companionKeys.list(),
        queryFn: api.list,
        staleTime: 60_000,
      }),
  };
}
