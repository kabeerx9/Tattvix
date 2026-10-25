import { createIdentityDocumentQueries } from "@tattvix/api";

import { createIdentityDocumentsApi } from "./api";

export const identityDocumentQueries = createIdentityDocumentQueries(createIdentityDocumentsApi);
