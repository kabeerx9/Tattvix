import assert from "node:assert/strict";
import { test } from "node:test";
import { supportContactsSchema } from "./support";

test("support accepts only nullable international numbers and rejects placeholder or injected links", () => {
  assert.equal(supportContactsSchema.safeParse({ callPhone: null, whatsappPhone: "+919000000001" }).success, true);
  for (const value of ["", "9000000001", "+910000000000", "tel:+919000000001", "https://example.com", "+919000000001?foo", "+01234567890"]) {
    assert.equal(supportContactsSchema.safeParse({ callPhone: value, whatsappPhone: null }).success, false);
  }
  assert.equal(supportContactsSchema.safeParse({ callPhone: null, whatsappPhone: null, secret: "no" }).success, false);
});
