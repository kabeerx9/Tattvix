import assert from "node:assert/strict";
import { test } from "node:test";
import { guestStayStatusLabel } from "./status";
test("guest status follows hotel operations independently of consent", () => {
  assert.equal(
    guestStayStatusLabel("PENDING_CHECK_IN"),
    "Waiting for reception",
  );
  assert.equal(guestStayStatusLabel("CHECKED_IN"), "Checked in");
  assert.equal(guestStayStatusLabel("CHECKED_OUT"), "Checked out");
});
