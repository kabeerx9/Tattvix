import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getInitials } from "./initials";

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    assert.equal(getInitials("The Lalit Chugtiya"), "TL");
    assert.equal(getInitials("kabeer joshi"), "KJ");
  });
  it("handles single words, extra spaces and empty input", () => {
    assert.equal(getInitials("Mulla"), "M");
    assert.equal(getInitials("  Riya   Mehta "), "RM");
    assert.equal(getInitials(""), "?");
  });
  it("skips words that do not start with a letter, such as emoji", () => {
    assert.equal(getInitials("🦋 Anaya Iyer"), "AI");
    assert.equal(getInitials("👩🏽‍💻 Priya"), "P");
    assert.equal(getInitials("🦋"), "?");
  });
  it("keeps non-Latin scripts whole", () => {
    assert.equal(getInitials("प्रियंका शर्मा"), "पश");
    assert.equal(getInitials("Ólafur Darri"), "ÓD");
  });
});
