import { createPlatformUsersApi } from "@tattvix/api";

import { apiClient } from "@/lib/api";

export const platformUsersApi = createPlatformUsersApi(apiClient);
