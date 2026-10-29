import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError } from "@tattvix/contracts";

import { UploadStepError, runUploadStep } from "./upload-steps";

test("a storage rejection names the step and the status", async () => {
  const error = await runUploadStep("send", () => Promise.reject(new ApiError(403, "Forbidden"))).catch((caught) => caught);
  assert.ok(error instanceof UploadStepError);
  assert.equal(error.step, "send");
  assert.equal(error.status, 403);
  assert.equal(error.message, "The photo did not reach storage (error 403). Try again.");
});

test("storage's own error code is kept for the report", async () => {
  const error = await runUploadStep("send", () => Promise.reject(new ApiError(403, "", "SignatureDoesNotMatch"))).catch((caught) => caught);
  assert.equal(error.message, "The photo did not reach storage (error 403, SignatureDoesNotMatch). Try again.");
});

test("an API refusal keeps the server's own message", async () => {
  const error = await runUploadStep("authorize", () => Promise.reject(new ApiError(400, "The photo is larger than 8 MB."))).catch((caught) => caught);
  assert.equal(error.message, "The photo is larger than 8 MB.");
});

test("no answer in time is a timeout for that step, and the work is told to stop", async () => {
  let stopped = false;
  const error = await runUploadStep("send", () => new Promise(() => {}), 10, () => (stopped = true)).catch((caught) => caught);
  assert.ok(error instanceof UploadStepError);
  assert.equal(error.timedOut, true);
  assert.equal(stopped, true);
  assert.match(error.message, /^The photo did not reach storage: it took too long/);
});

test("a lost connection to the API says so", async () => {
  const error = await runUploadStep("authorize", () => Promise.reject(new TypeError("Network request failed"))).catch((caught) => caught);
  assert.equal(error.message, "Tattwix could not start the upload: no connection. Try again.");
});

test("a device error during preparation has no status", async () => {
  const error = await runUploadStep("prepare", () => Promise.reject(new Error("decode failed"))).catch((caught) => caught);
  assert.equal(error.status, null);
  assert.equal(error.message, "The photo could not be read on this device. Try again.");
});

test("a step that succeeds returns its value", async () => {
  assert.equal(await runUploadStep("confirm", async () => 7), 7);
});
