import { createPlatformOrganizationsApi } from "@tattvix/api";

import { apiClient } from "@/lib/api";

export const platformOrganizationsApi = createPlatformOrganizationsApi(apiClient);
