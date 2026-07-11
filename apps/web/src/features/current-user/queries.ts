import { queryOptions } from "@tanstack/react-query";

import { getCurrentUser } from "./api";
import { currentUserKeys } from "./keys";

export const currentUserQueries = {
  detail: (
    clerkUserId: string,
    getToken: () => Promise<string | null | undefined>,
  ) => queryOptions({
    queryKey: currentUserKeys.detail(clerkUserId),
    queryFn: () => getCurrentUser(getToken),
    staleTime: 60_000,
  }),
};
