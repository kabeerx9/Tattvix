import { createPlatformPortfolioApi } from "@tattvix/api";

import { apiClient } from "@/lib/api";

export const platformPortfolioApi = createPlatformPortfolioApi(apiClient);
