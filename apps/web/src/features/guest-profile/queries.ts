import { queryOptions } from "@tanstack/react-query";

import { guestProfileApi } from "./api";
import { guestProfileKeys } from "./keys";

export const guestProfileQueries = {
  detail: () =>
    queryOptions({
      queryKey: guestProfileKeys.detail(),
      queryFn: guestProfileApi.get,
      staleTime: 60_000,
    }),
};
