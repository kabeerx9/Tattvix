import { createPlatformOrganizationQueries } from "@tattvix/api";

import { platformOrganizationsApi } from "./api";

export const platformOrganizationQueries = createPlatformOrganizationQueries(platformOrganizationsApi);
