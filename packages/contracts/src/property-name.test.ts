import assert from "node:assert/strict";
import { test } from "node:test";
import { propertyNameSchema } from "./property-name";

test("property names trim whitespace, stay bounded and cannot change URL identity", () => {
  assert.deepEqual(propertyNameSchema.parse({ name: "  Jaipur House  " }), { name: "Jaipur House" });
  assert.equal(propertyNameSchema.safeParse({ name: "a".repeat(255) }).success, true);
  for (const input of [{}, { name: "" }, { name: "   " }, { name: "a".repeat(256) }, { name: null }, { name: "House", slug: "new" }]) {
    assert.equal(propertyNameSchema.safeParse(input).success, false);
  }
});
