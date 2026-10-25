import { queryOptions } from "@tanstack/react-query";
import {
  platformMemberSchema,
  platformOrganizationDetailSchema,
  platformOrganizationListResponseSchema,
  platformOrganizationOnboardingResponseSchema,
  platformPropertySchema,
  platformSubscriptionSchema,
  type ApiClient,
  type PlatformMemberAddInput,
  type PlatformMemberUpdateInput,
  type PlatformOrganizationOnboardingInput,
  type PlatformPropertyCreateInput,
  type PlatformTrialExtendInput,
} from "@tattvix/contracts";

export const platformOrganizationKeys = {
  all: ["platform-organizations"] as const,
  list: () => [...platformOrganizationKeys.all, "list"] as const,
  detail: (organizationSlug: string) =>
    [...platformOrganizationKeys.all, "detail", organizationSlug] as const,
};

function organizationBase(organizationSlug: string) {
  return `/api/platform/organizations/${encodeURIComponent(organizationSlug)}`;
}

export function createPlatformOrganizationsApi(client: ApiClient) {
  return {
    onboard(input: PlatformOrganizationOnboardingInput) {
      return client.requestJson("/api/platform/organizations/", platformOrganizationOnboardingResponseSchema, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    list() {
      return client.requestJson("/api/platform/organizations/", platformOrganizationListResponseSchema);
    },
    detail(organizationSlug: string) {
      return client.requestJson(`${organizationBase(organizationSlug)}/`, platformOrganizationDetailSchema);
    },
    createProperty(organizationSlug: string, input: PlatformPropertyCreateInput) {
      return client.requestJson(`${organizationBase(organizationSlug)}/properties/`, platformPropertySchema, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    addMember(organizationSlug: string, input: PlatformMemberAddInput) {
      return client.requestJson(`${organizationBase(organizationSlug)}/members/`, platformMemberSchema, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    updateMember(organizationSlug: string, memberId: number, input: PlatformMemberUpdateInput) {
      return client.requestJson(`${organizationBase(organizationSlug)}/members/${memberId}/`, platformMemberSchema, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
    extendTrial(organizationSlug: string, input: PlatformTrialExtendInput) {
      return client.requestJson(
        `${organizationBase(organizationSlug)}/subscription/extend-trial/`,
        platformSubscriptionSchema,
        { method: "POST", body: JSON.stringify(input) },
      );
    },
  };
}
export type PlatformOrganizationsApi = ReturnType<typeof createPlatformOrganizationsApi>;

export function createPlatformOrganizationQueries(api: PlatformOrganizationsApi) {
  return {
    list: () =>
      queryOptions({
        queryKey: platformOrganizationKeys.list(),
        queryFn: () => api.list(),
        staleTime: 30_000,
      }),
    detail: (organizationSlug: string) =>
      queryOptions({
        queryKey: platformOrganizationKeys.detail(organizationSlug),
        queryFn: () => api.detail(organizationSlug),
        staleTime: 15_000,
      }),
  };
}
