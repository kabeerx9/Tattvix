import type { QueryClient } from "@tanstack/react-query";

import { guestProfileApi } from "./api";
import { guestProfileKeys } from "./keys";

export const guestProfileMutations = {
  update: (queryClient: QueryClient) => ({
    mutationFn: guestProfileApi.update,
    onSuccess: (profile: Awaited<ReturnType<typeof guestProfileApi.update>>) => {
      queryClient.setQueryData(guestProfileKeys.detail(), profile);
    },
  }),
};
