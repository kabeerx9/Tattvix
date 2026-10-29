import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ACCOUNT_NOT_FOUND, EMAIL_TAKEN, describeClerkError } from "./clerk-errors";

describe("describeClerkError", () => {
  it("prefers Clerk's long message and keeps the code", () => {
    const error = { errors: [{ code: EMAIL_TAKEN, message: "is taken", longMessage: "That email address is taken. Please try another." }] };
    assert.deepEqual(describeClerkError(error, "fallback"), { code: EMAIL_TAKEN, message: "That email address is taken. Please try another." });
  });

  it("falls back to the short message when there is no long one", () => {
    const error = { errors: [{ code: ACCOUNT_NOT_FOUND, message: "Couldn't find your account." }] };
    assert.deepEqual(describeClerkError(error, "fallback"), { code: ACCOUNT_NOT_FOUND, message: "Couldn't find your account." });
  });

  it("uses the fallback when Clerk sends no readable error", () => {
    assert.deepEqual(describeClerkError({ errors: [] }, "Try again."), { code: null, message: "Try again." });
    assert.deepEqual(describeClerkError({ errors: [{ code: "x" }] }, "Try again."), { code: null, message: "Try again." });
    assert.deepEqual(describeClerkError(null, "Try again."), { code: null, message: "Try again." });
  });

  it("shows a plain Error's message without a code", () => {
    assert.deepEqual(describeClerkError(new Error("Network request failed"), "fallback"), { code: null, message: "Network request failed" });
  });
});
