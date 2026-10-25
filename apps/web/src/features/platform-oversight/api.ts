import { createPlatformOversightApi } from "@tattvix/api";

import { apiClient } from "@/lib/api";

export const platformOversightApi = createPlatformOversightApi(apiClient);
