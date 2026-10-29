import assert from "node:assert/strict";
import { test } from "node:test";

import { nextFieldIndex } from "./focus-chain";

test("moves to the following field", () => {
  assert.equal(nextFieldIndex(["a", "b", "c"], 0), 1);
});

test("skips fields that are not rendered", () => {
  assert.equal(nextFieldIndex(["a", null, undefined, "d"], 0), 3);
});

test("reports the end of the chain", () => {
  assert.equal(nextFieldIndex(["a", "b"], 1), -1);
  assert.equal(nextFieldIndex(["a", null], 0), -1);
});
