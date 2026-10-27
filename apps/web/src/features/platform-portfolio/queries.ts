import { createPlatformPortfolioQueries } from "@tattvix/api";

import { platformPortfolioApi } from "./api";

export { platformPortfolioKeys } from "@tattvix/api";

export const platformPortfolioQueries = createPlatformPortfolioQueries(platformPortfolioApi, { includeContacts: true });
