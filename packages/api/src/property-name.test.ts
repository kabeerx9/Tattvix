import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { ApiError, createApiClient } from "@tattvix/contracts";
import { createPropertyNameApi, propertyNameKeys, propertyNameMutation } from "./property-name";

test("rename updates its cache and invalidates names across both clients without invalidating unrelated data", async () => {
  const requests: { url: string; method: string | undefined; body: unknown }[] = [];
  const api = createPropertyNameApi(createApiClient({
    baseUrl: "https://example.test", getToken: async () => "token",
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), method: init?.method, body: JSON.parse(String(init?.body)) });
      return Response.json({ name: "Jaipur House" });
    },
  }));
  const cache = new QueryClient();
  const consumers = ["current-user", "platform-portfolio", "platform-organizations", "hotel-overview", "check-in"];
  for (const key of [...consumers, "identity-documents"]) cache.setQueryData([key, "existing"], { name: "Old name" });
  const mutation = propertyNameMutation(api, cache, "hotel", "jaipur");
  const data = await mutation.mutationFn({ name: "  Jaipur House  " });
  await mutation.onSuccess(data);
  assert.deepEqual(requests, [{ url: "https://example.test/api/hotel/hotel/jaipur/name/", method: "PATCH", body: { name: "Jaipur House" } }]);
  assert.deepEqual(cache.getQueryData(propertyNameKeys.property("hotel", "jaipur")), data);
  for (const key of consumers) assert.equal(cache.getQueryState([key, "existing"])?.isInvalidated, true);
  assert.equal(cache.getQueryState(["identity-documents", "existing"])?.isInvalidated, false);
  cache.clear();
});

test("failed rename propagates the server error and preserves the cached name", async () => {
  const api = createPropertyNameApi(createApiClient({
    baseUrl: "https://example.test", getToken: async () => null,
    fetchImpl: async () => Response.json({ error: "Denied" }, { status: 403 }),
  }));
  const cache = new QueryClient();
  const key = propertyNameKeys.property("hotel", "jaipur");
  cache.setQueryData(key, { name: "Old name" });
  await assert.rejects(propertyNameMutation(api, cache, "hotel", "jaipur").mutationFn({ name: "New name" }), ApiError);
  assert.deepEqual(cache.getQueryData(key), { name: "Old name" });
  cache.clear();
});
