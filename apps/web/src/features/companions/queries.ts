import { createCompanionQueries } from "@tattvix/api";

import { companionsApi } from "./api";

export const companionQueries = createCompanionQueries(companionsApi);
