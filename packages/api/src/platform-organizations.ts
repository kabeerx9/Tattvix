import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  platformMemberSchema,
  platformOrganizationDetailSchema,
  platformOrganizationListResponseSchema,
  platformOrganizationOnboardingResponseSchema,
  platformPropertySchema,
  platformSubscriptionSchema,
  type ApiClient,
  type PlatformMember,
  type PlatformMemberAddInput,
  type PlatformMemberUpdateInput,
  type PlatformMembershipRole,
  type PlatformOrganizationOnboardingInput,
  type PlatformPropertyCreateInput,
  type PlatformTrialExtendInput,
  type SubscriptionEvent,
} from "@tattvix/contracts";

import { platformPortfolioKeys } from "./platform-portfolio";

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

// --- Mutations -------------------------------------------------------------
// Every writer invalidates the organization's detail, the list and the
// portfolio, because member and property changes show up in all three.

function invalidateOrganization(queryClient: QueryClient, organizationSlug: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: platformOrganizationKeys.detail(organizationSlug) }),
    queryClient.invalidateQueries({ queryKey: platformOrganizationKeys.list() }),
    queryClient.invalidateQueries({ queryKey: platformPortfolioKeys.all }),
  ]);
}

export function createPlatformOrganizationMutations(api: PlatformOrganizationsApi) {
  return {
    onboard: (queryClient: QueryClient) => ({
      mutationFn: (input: PlatformOrganizationOnboardingInput) => api.onboard(input),
      onSuccess: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: platformOrganizationKeys.all }),
          queryClient.invalidateQueries({ queryKey: platformPortfolioKeys.all }),
        ]),
    }),
    createProperty: (queryClient: QueryClient) => ({
      mutationFn: ({ organizationSlug, input }: { organizationSlug: string; input: PlatformPropertyCreateInput }) =>
        api.createProperty(organizationSlug, input),
      onSuccess: (_property: unknown, variables: { organizationSlug: string }) => invalidateOrganization(queryClient, variables.organizationSlug),
    }),
    addMember: (queryClient: QueryClient) => ({
      mutationFn: ({ organizationSlug, input }: { organizationSlug: string; input: PlatformMemberAddInput }) =>
        api.addMember(organizationSlug, input),
      onSuccess: (_member: unknown, variables: { organizationSlug: string }) => invalidateOrganization(queryClient, variables.organizationSlug),
    }),
    updateMember: (queryClient: QueryClient) => ({
      mutationFn: ({ organizationSlug, memberId, input }: { organizationSlug: string; memberId: number; input: PlatformMemberUpdateInput }) =>
        api.updateMember(organizationSlug, memberId, input),
      onSuccess: (_member: unknown, variables: { organizationSlug: string }) => invalidateOrganization(queryClient, variables.organizationSlug),
    }),
    extendTrial: (queryClient: QueryClient) => ({
      mutationFn: ({ organizationSlug, input }: { organizationSlug: string; input: PlatformTrialExtendInput }) =>
        api.extendTrial(organizationSlug, input),
      onSuccess: (_subscription: unknown, variables: { organizationSlug: string }) => invalidateOrganization(queryClient, variables.organizationSlug),
    }),
  };
}

// --- Labels ----------------------------------------------------------------

export const PLATFORM_ROLES: readonly PlatformMembershipRole[] = ["OWNER", "MANAGER", "RECEPTION"];

export function platformRoleLabel(role: PlatformMembershipRole) {
  return { OWNER: "Owner", MANAGER: "Manager", RECEPTION: "Reception" }[role];
}

/** First and last name, or the email when the account has no name yet. */
export function platformMemberName(member: Pick<PlatformMember, "user">) {
  return [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") || member.user.email;
}

export function subscriptionEventLabel(kind: SubscriptionEvent["kind"]) {
  return kind === "TRIAL_STARTED" ? "Trial started" : "Trial extended";
}

/** "8 Dec → 22 Dec · admin@x · note · 1 Dec": one line per subscription event. */
export function describeSubscriptionEvent(event: SubscriptionEvent, formatDate: (iso: string) => string) {
  const dates = event.previousTrialEndsAt
    ? `${formatDate(event.previousTrialEndsAt)} → ${formatDate(event.newTrialEndsAt)}`
    : `until ${formatDate(event.newTrialEndsAt)}`;
  return [dates, event.actorEmail || null, event.note || null, formatDate(event.createdAt)].filter(Boolean).join(" · ");
}

/** The default new trial end: two weeks past the current end, or past today once expired. */
export function defaultTrialExtension(subscription: { entitled: boolean; trialEndsAt: string | null }, days = 14, now: Date = new Date()) {
  const base = subscription.entitled && subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : new Date(now);
  base.setDate(base.getDate() + days);
  return base;
}

/** The trial runs to the end of the chosen day, local to the admin. */
export function endOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
}
