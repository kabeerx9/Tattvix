import assert from "node:assert/strict";
import { test } from "node:test";
import { stayStatusLabel } from "./guest-stay-status";
test("guests and staff see the same name for each stay status", () => {
  assert.equal(stayStatusLabel("PENDING_CHECK_IN"), "Waiting for a room");
  assert.equal(stayStatusLabel("CHECKED_IN"), "Checked in");
  assert.equal(stayStatusLabel("CHECKED_OUT"), "Checked out");
});
