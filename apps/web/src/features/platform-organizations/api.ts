import {
  platformMemberSchema,
  platformOrganizationDetailSchema,
  platformOrganizationListResponseSchema,
  platformOrganizationOnboardingResponseSchema,
  platformPropertySchema,
  type PlatformMemberAddInput,
  type PlatformMemberUpdateInput,
  type PlatformOrganizationOnboardingInput,
  type PlatformPropertyCreateInput,
} from "@tattvix/contracts";

import { apiClient } from "@/lib/api";

function organizationBase(organizationSlug: string) {
  return `/api/platform/organizations/${encodeURIComponent(organizationSlug)}`;
}

export const platformOrganizationsApi = {
  onboard(input: PlatformOrganizationOnboardingInput) {
    return apiClient.requestJson(
      "/api/platform/organizations/",
      platformOrganizationOnboardingResponseSchema,
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  list() {
    return apiClient.requestJson(
      "/api/platform/organizations/",
      platformOrganizationListResponseSchema,
    );
  },
  detail(organizationSlug: string) {
    return apiClient.requestJson(
      `${organizationBase(organizationSlug)}/`,
      platformOrganizationDetailSchema,
    );
  },
  createProperty(organizationSlug: string, input: PlatformPropertyCreateInput) {
    return apiClient.requestJson(
      `${organizationBase(organizationSlug)}/properties/`,
      platformPropertySchema,
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  addMember(organizationSlug: string, input: PlatformMemberAddInput) {
    return apiClient.requestJson(
      `${organizationBase(organizationSlug)}/members/`,
      platformMemberSchema,
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  updateMember(
    organizationSlug: string,
    memberId: number,
    input: PlatformMemberUpdateInput,
  ) {
    return apiClient.requestJson(
      `${organizationBase(organizationSlug)}/members/${memberId}/`,
      platformMemberSchema,
      { method: "PATCH", body: JSON.stringify(input) },
    );
  },
};
