import assert from "node:assert/strict";
import { test } from "node:test";
import { createApiClient } from "@tattvix/contracts";
import { createSupportApi, getSupportContacts } from "./support";

test("support builds separate call and WhatsApp links without including guest data", () => {
  assert.deepEqual(getSupportContacts({ callPhone: "+919000000001", whatsappPhone: "+919000000002" }), {
    call: { label: "+91 90000 00001", href: "tel:+919000000001" },
    whatsapp: { label: "+91 90000 00002", href: "https://wa.me/919000000002" },
  });
  assert.deepEqual(getSupportContacts({ callPhone: null, whatsappPhone: null }), { call: null, whatsapp: null });
  assert.equal(getSupportContacts({ callPhone: "+919000000001", whatsappPhone: null }).whatsapp, null);
});

test("support fetch uses its own contract, without changing installed-client responses", async () => {
  const api = createSupportApi(createApiClient({
    baseUrl: "https://example.test", getToken: async () => null,
    fetchImpl: async (url) => {
      assert.equal(String(url), "https://example.test/api/support/");
      return Response.json({ callPhone: null, whatsappPhone: "+919000000002" });
    },
  }));
  assert.deepEqual(await api.get(), { callPhone: null, whatsappPhone: "+919000000002" });
});
