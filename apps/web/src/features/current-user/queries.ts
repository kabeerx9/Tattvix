import { queryOptions } from "@tanstack/react-query";
import { currentUserKeys } from "@tattvix/api";

import { getCurrentUser } from "./api";

export const currentUserQueries = {
  detail: (clerkUserId: string, getToken: () => Promise<string | null | undefined>) =>
    queryOptions({
      queryKey: currentUserKeys.detail(clerkUserId),
      queryFn: () => getCurrentUser(getToken),
      staleTime: 60_000,
    }),
};
