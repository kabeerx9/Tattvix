import type { CompanionProfile, CompanionProfileListResponse } from "@tattvix/contracts";
import type { QueryClient } from "@tanstack/react-query";

import { companionsApi } from "./api";
import { companionKeys } from "./keys";

function updateCachedCompanions(
  queryClient: QueryClient,
  update: (companions: CompanionProfile[]) => CompanionProfile[],
) {
  queryClient.setQueryData<CompanionProfileListResponse>(
    companionKeys.list(),
    (current) =>
      current ? { companions: update(current.companions) } : current,
  );
}

export const companionMutations = {
  create: (queryClient: QueryClient) => ({
    mutationFn: companionsApi.create,
    onSuccess: (companion: CompanionProfile) => {
      updateCachedCompanions(queryClient, (companions) => [
        companion,
        ...companions,
      ]);
    },
  }),
  update: (queryClient: QueryClient) => ({
    mutationFn: ({ id, input }: { id: number; input: Parameters<typeof companionsApi.update>[1] }) =>
      companionsApi.update(id, input),
    onSuccess: (companion: CompanionProfile) => {
      updateCachedCompanions(queryClient, (companions) =>
        companions.map((item) => (item.id === companion.id ? companion : item)),
      );
    },
  }),
  remove: (queryClient: QueryClient) => ({
    mutationFn: companionsApi.remove,
    onSuccess: (_unused: void, id: number) => {
      updateCachedCompanions(queryClient, (companions) =>
        companions.filter((item) => item.id !== id),
      );
    },
  }),
};
