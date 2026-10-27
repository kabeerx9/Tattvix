import assert from "node:assert/strict";
import { test } from "node:test";
import { createApiClient } from "@tattvix/contracts";
import { createPlatformPortfolioApi, createPlatformPortfolioQueries } from "./platform-portfolio";

test("portfolio keeps legacy requests unchanged and explicitly opts web into contacts", async () => {
  const urls: string[] = [];
  const api = createPlatformPortfolioApi(createApiClient({
    baseUrl: "https://example.test", getToken: async () => null,
    fetchImpl: async (url) => {
      urls.push(String(url));
      return Response.json({ generatedAt: "2026-10-27T00:00:00Z", properties: [] });
    },
  }));
  await api.list();
  await api.list("hotel-group");
  await api.list("hotel-group", true);
  assert.deepEqual(urls, [
    "https://example.test/api/platform/portfolio/",
    "https://example.test/api/platform/portfolio/?organization=hotel-group",
    "https://example.test/api/platform/portfolio/?organization=hotel-group&includeContacts=true",
  ]);
  assert.notDeepEqual(
    createPlatformPortfolioQueries(api).list().queryKey,
    createPlatformPortfolioQueries(api, { includeContacts: true }).list().queryKey,
  );
});
