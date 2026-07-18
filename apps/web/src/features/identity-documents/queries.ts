import { queryOptions } from "@tanstack/react-query";

import { identityDocumentsApi } from "./api";
import { identityDocumentKeys } from "./keys";

export const identityDocumentQueries = {
  list: () =>
    queryOptions({
      queryKey: identityDocumentKeys.list(),
      queryFn: identityDocumentsApi.list,
      staleTime: 60_000,
    }),
};
