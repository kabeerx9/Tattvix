import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMoneyMinor, formatMoneyMinor } from "./money";
test("money input preserves paise without floating-point multiplication", () => {
  assert.equal(parseMoneyMinor(" 25.50 "), 2550);
  assert.equal(parseMoneyMinor("0.29"), 29);
  assert.equal(parseMoneyMinor("2500"), 250000);
  assert.equal(parseMoneyMinor("0"), 0);
  for (const invalid of ["", "-1", "1.005", "NaN", "1e3", "1,000", "1000001"])
    assert.equal(parseMoneyMinor(invalid), null);
});
test("bill display retains two paise digits", () => {
  assert.match(formatMoneyMinor(29), /0\.29/);
  assert.match(formatMoneyMinor(2550), /25\.50/);
});
