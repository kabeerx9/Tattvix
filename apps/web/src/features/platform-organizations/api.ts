import {
  platformOrganizationOnboardingResponseSchema,
  type PlatformOrganizationOnboardingInput,
} from "@tattvix/contracts";

import { apiClient } from "@/lib/api";

export const platformOrganizationsApi = {
  onboard(input: PlatformOrganizationOnboardingInput) {
    return apiClient.requestJson(
      "/api/platform/organizations/",
      platformOrganizationOnboardingResponseSchema,
      { method: "POST", body: JSON.stringify(input) },
    );
  },
};
