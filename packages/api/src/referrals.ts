import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  referralCodeSchema,
  referralCreatedSchema,
  referralDashboardSchema,
  type ApiClient,
} from "@tattvix/contracts";
export const referralKeys = {
  account: (ownerId: number) => ["referrals", ownerId] as const,
  dashboard: (ownerId: number, before?: number) =>
    ["referrals", ownerId, before ?? "first"] as const,
};
export function createReferralsApi(client: ApiClient) {
  return {
    dashboard: (before?: number) =>
      client.requestJson(
        `/api/account/referrals/${before === undefined ? "" : `?before=${before}`}`,
        referralDashboardSchema,
      ),
    createCode: () =>
      client.requestJson("/api/account/referrals/", referralCreatedSchema, {
        method: "POST",
        body: "{}",
      }),
  };
}
export type ReferralsApi = ReturnType<typeof createReferralsApi>;
export function referralDashboardQuery(
  api: ReferralsApi,
  ownerId: number,
  before?: number,
) {
  return queryOptions({
    queryKey: referralKeys.dashboard(ownerId, before),
    queryFn: () => api.dashboard(before),
    staleTime: 10_000,
    refetchInterval: (query) =>
      (query.state.data?.summary.pending ?? 0) > 0 ? 15_000 : false,
  });
}
export function createReferralCodeMutation(
  api: ReferralsApi,
  client: QueryClient,
  ownerId: number,
) {
  return {
    mutationFn: () => api.createCode(),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: referralKeys.account(ownerId) }),
  };
}
export function buildReferralLink(webUrl: string, code: string) {
  const url = new URL("/register-hotel", webUrl);
  url.searchParams.set("ref", referralCodeSchema.parse(code));
  return url.toString();
}
