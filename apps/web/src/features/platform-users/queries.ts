import { queryOptions } from "@tanstack/react-query";

import { platformUsersApi } from "./api";
import { platformUserKeys } from "./keys";

export const platformUserQueries = {
  search: (email: string) => queryOptions({
    queryKey: platformUserKeys.search(email),
    queryFn: () => platformUsersApi.search({ email }),
    enabled: email.length >= 3,
    staleTime: 30_000,
  }),
};
