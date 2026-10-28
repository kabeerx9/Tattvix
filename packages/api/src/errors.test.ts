import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ApiError } from "@tattvix/contracts";

import { classifyApiError, describeLoadFailure, shouldRetryQuery } from "./errors";

describe("classifyApiError", () => {
  it("maps 401 to unauthorized", () => {
    assert.deepEqual(classifyApiError(new ApiError(401, "Bad token")), { kind: "unauthorized", message: "Bad token" });
  });
  it("maps 402 to entitlement with the server code", () => {
    assert.deepEqual(classifyApiError(new ApiError(402, "Trial over", "subscription_expired")), {
      kind: "entitlement",
      message: "Trial over",
      code: "subscription_expired",
    });
  });
  it("maps 403 to forbidden", () => {
    assert.equal(classifyApiError(new ApiError(403, "No")).kind, "forbidden");
  });
  it("maps 400 and 409 to rejected and keeps the status", () => {
    assert.deepEqual(classifyApiError(new ApiError(409, "Already checked out", "stay_closed")), {
      kind: "rejected",
      message: "Already checked out",
      code: "stay_closed",
      status: 409,
    });
    assert.equal(classifyApiError(new ApiError(400, "Bad input")).status, 400);
  });
  it("maps 404 to missing", () => {
    assert.equal(classifyApiError(new ApiError(404, "Gone")).kind, "missing");
  });
  it("maps 5xx to server with the status", () => {
    assert.deepEqual(classifyApiError(new ApiError(503, "Down")), { kind: "server", message: "Down", status: 503 });
  });
  it("treats fetch TypeErrors as network failures", () => {
    assert.equal(classifyApiError(new TypeError("Network request failed")).kind, "network");
  });
  it("falls back to server for unknown throwables", () => {
    assert.deepEqual(classifyApiError("boom"), { kind: "server", message: "Something went wrong.", status: null });
  });
  it("uses a default message when the server sent none", () => {
    assert.equal(classifyApiError(new ApiError(500, "")).message, "Something went wrong.");
  });
});

describe("shouldRetryQuery", () => {
  it("retries network and server failures twice", () => {
    assert.equal(shouldRetryQuery(0, new TypeError("Network request failed")), true);
    assert.equal(shouldRetryQuery(1, new ApiError(502, "Bad gateway")), true);
    assert.equal(shouldRetryQuery(2, new ApiError(502, "Bad gateway")), false);
  });
  it("never retries auth, permission, entitlement or validation failures", () => {
    for (const status of [400, 401, 402, 403, 404, 409]) {
      assert.equal(shouldRetryQuery(0, new ApiError(status, "x")), false, `status ${status}`);
    }
  });
});

describe("describeLoadFailure", () => {
  it("offers a way back for a missing or forbidden page", () => {
    assert.deepEqual(describeLoadFailure(new ApiError(404, "Not found.")), { message: "This page is no longer available.", action: "back" });
    assert.equal(describeLoadFailure(new ApiError(403, "No")).action, "back");
  });
  it("keeps the connection message for network failures", () => {
    assert.deepEqual(describeLoadFailure(new TypeError("Network request failed")), {
      message: "Could not reach Tattwix. Check the connection and try again.",
      action: "retry",
    });
  });
  it("offers a retry for server failures without blaming the connection", () => {
    assert.deepEqual(describeLoadFailure(new ApiError(500, "Boom")), { message: "This page could not load. Try again in a moment.", action: "retry" });
    assert.equal(describeLoadFailure(undefined).action, "retry");
  });
});
