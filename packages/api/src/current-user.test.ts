import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError } from "@tattvix/contracts";
import { describeAccountDeletionFailure } from "./current-user";

test("an owner refusal and a storage outage show the server's words; anything else is generic", () => {
  const refusal = new ApiError(409, "You own a hotel on Tattwix. Contact support to hand it over before deleting your account.", "owner_has_hotel");
  assert.equal(describeAccountDeletionFailure(refusal), refusal.message);
  assert.equal(describeAccountDeletionFailure(new ApiError(503, "Storage is down.", "storage_unavailable")), "Storage is down.");
  assert.match(describeAccountDeletionFailure(new ApiError(500, "Server Error")), /Nothing was changed/);
  assert.match(describeAccountDeletionFailure(new ApiError(401, "Unauthorized")), /Nothing was changed/);
  assert.match(describeAccountDeletionFailure(new TypeError("Failed to fetch")), /connection/);
});
