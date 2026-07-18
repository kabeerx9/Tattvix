import { queryOptions } from "@tanstack/react-query";

import { checkInApi } from "./api";
import { checkInKeys } from "./keys";

export const checkInQueries = {
  shares: () =>
    queryOptions({
      queryKey: checkInKeys.shares(),
      queryFn: checkInApi.listShares,
      staleTime: 30_000,
    }),
  context: (token: string) =>
    queryOptions({
      queryKey: checkInKeys.context(token),
      queryFn: () => checkInApi.getContext(token),
      staleTime: 30_000,
    }),
};
