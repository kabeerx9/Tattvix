import { queryOptions } from "@tanstack/react-query";

import { createIdentityDocumentsApi } from "./api";
import { identityDocumentKeys } from "./keys";

export const identityDocumentQueries = {
  list: (companionId?: number) => {
    const api = createIdentityDocumentsApi(companionId);

    return queryOptions({
      queryKey: identityDocumentKeys.list(companionId),
      queryFn: api.list,
      staleTime: 60_000,
    });
  },
};
