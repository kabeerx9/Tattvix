import type { QueryClient } from "@tanstack/react-query";

import { platformOrganizationsApi } from "./api";
import { platformOrganizationKeys } from "./keys";

export const platformOrganizationMutations = {
  onboard: (queryClient: QueryClient) => ({
    mutationFn: platformOrganizationsApi.onboard,
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: platformOrganizationKeys.all,
    }),
  }),
};
