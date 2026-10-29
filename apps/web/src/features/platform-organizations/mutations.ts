import { createPlatformOrganizationMutations } from "@tattvix/api";

import { platformOrganizationsApi } from "./api";

export const platformOrganizationMutations = createPlatformOrganizationMutations(platformOrganizationsApi);
