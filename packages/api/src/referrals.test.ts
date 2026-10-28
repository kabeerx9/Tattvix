import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { createApiClient } from "@tattvix/contracts";
import {
  buildReferralLink,
  createReferralsApi,
  createReferralCodeMutation,
  referralDashboardQuery,
  referralKeys,
} from "./referrals";
test("referral links are a registration URL carrying the normalized code", () => {
  assert.equal(
    buildReferralLink("https://tattwix.in/some/path", "abcd2345efgh"),
    "https://tattwix.in/register-hotel?ref=ABCD2345EFGH",
  );
  assert.throws(() => buildReferralLink("https://tattwix.in", "bad"));
});
test("private referral keys isolate owner accounts and cursors", () => {
  const api = createReferralsApi(
    createApiClient({
      baseUrl: "https://example.test",
      getToken: async () => null,
    }),
  );
  assert.notDeepEqual(
    referralDashboardQuery(api, 1).queryKey,
    referralDashboardQuery(api, 2).queryKey,
  );
  assert.notDeepEqual(
    referralDashboardQuery(api, 1).queryKey,
    referralDashboardQuery(api, 1, 42).queryKey,
  );
});
test("code creation POST has no attribution fields and refreshes only its account", async () => {
  const api = createReferralsApi(
    createApiClient({
      baseUrl: "https://example.test",
      getToken: async () => null,
      fetchImpl: async (url, init) => {
        assert.equal(
          String(url),
          "https://example.test/api/account/referrals/",
        );
        assert.equal(init?.method, "POST");
        assert.deepEqual(JSON.parse(String(init?.body)), {});
        return Response.json({ code: "ABCD2345EFGH" });
      },
    }),
  );
  const client = new QueryClient();
  client.setQueryData(referralKeys.dashboard(1), {});
  client.setQueryData(referralKeys.dashboard(2), {});
  const mutation = createReferralCodeMutation(api, client, 1);
  assert.equal((await mutation.mutationFn()).code, "ABCD2345EFGH");
  await mutation.onSuccess();
  assert.equal(
    client.getQueryState(referralKeys.dashboard(1))?.isInvalidated,
    true,
  );
  assert.equal(
    client.getQueryState(referralKeys.dashboard(2))?.isInvalidated,
    false,
  );
});
