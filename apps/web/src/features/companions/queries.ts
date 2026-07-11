import { queryOptions } from "@tanstack/react-query";

import { companionsApi } from "./api";
import { companionKeys } from "./keys";

export const companionQueries = {
  list: () =>
    queryOptions({
      queryKey: companionKeys.list(),
      queryFn: companionsApi.list,
      staleTime: 60_000,
    }),
};
