import { createCompanionsApi } from "@tattvix/api";

import { apiClient } from "@/lib/api";

export const companionsApi = createCompanionsApi(apiClient);
