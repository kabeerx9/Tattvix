import type {
  PlatformMemberAddInput,
  PlatformMemberUpdateInput,
  PlatformPropertyCreateInput,
} from "@tattvix/contracts";
import type { QueryClient } from "@tanstack/react-query";

import { platformOrganizationsApi } from "./api";
import { platformOrganizationKeys } from "./keys";

function invalidateOrganization(
  queryClient: QueryClient,
  organizationSlug: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: platformOrganizationKeys.detail(organizationSlug),
    }),
    queryClient.invalidateQueries({
      queryKey: platformOrganizationKeys.list(),
    }),
  ]);
}

export const platformOrganizationMutations = {
  onboard: (queryClient: QueryClient) => ({
    mutationFn: platformOrganizationsApi.onboard,
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: platformOrganizationKeys.all,
    }),
  }),
  createProperty: (queryClient: QueryClient) => ({
    mutationFn: ({
      organizationSlug,
      input,
    }: {
      organizationSlug: string;
      input: PlatformPropertyCreateInput;
    }) => platformOrganizationsApi.createProperty(organizationSlug, input),
    onSuccess: (_property: unknown, variables: { organizationSlug: string }) =>
      invalidateOrganization(queryClient, variables.organizationSlug),
  }),
  addMember: (queryClient: QueryClient) => ({
    mutationFn: ({
      organizationSlug,
      input,
    }: {
      organizationSlug: string;
      input: PlatformMemberAddInput;
    }) => platformOrganizationsApi.addMember(organizationSlug, input),
    onSuccess: (_member: unknown, variables: { organizationSlug: string }) =>
      invalidateOrganization(queryClient, variables.organizationSlug),
  }),
  updateMember: (queryClient: QueryClient) => ({
    mutationFn: ({
      organizationSlug,
      memberId,
      input,
    }: {
      organizationSlug: string;
      memberId: number;
      input: PlatformMemberUpdateInput;
    }) =>
      platformOrganizationsApi.updateMember(organizationSlug, memberId, input),
    onSuccess: (_member: unknown, variables: { organizationSlug: string }) =>
      invalidateOrganization(queryClient, variables.organizationSlug),
  }),
};
