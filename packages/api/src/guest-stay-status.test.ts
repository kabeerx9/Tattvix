import assert from "node:assert/strict";
import { test } from "node:test";
import { getCurrentGuestStay, stayStatusLabel } from "./guest-stay-status";
test("guests and staff see the same name for each stay status", () => {
  assert.equal(stayStatusLabel("PENDING_CHECK_IN"), "Waiting for a room");
  assert.equal(stayStatusLabel("CHECKED_IN"), "Checked in");
  assert.equal(stayStatusLabel("CHECKED_OUT"), "Checked out");
});

test("guest home shows the checked-in stay first, never a revoked request", () => {
  const revoked = { id: "a", operationalStatus: "PENDING_CHECK_IN", status: "REVOKED" } as const;
  const waiting = { id: "b", operationalStatus: "PENDING_CHECK_IN", status: "SUBMITTED" } as const;
  const inHouse = { id: "c", operationalStatus: "CHECKED_IN", status: "SUBMITTED" } as const;
  assert.equal(getCurrentGuestStay([revoked, waiting, inHouse])?.id, "c");
  assert.equal(getCurrentGuestStay([revoked, waiting])?.id, "b");
  assert.equal(getCurrentGuestStay([revoked]), null);
});
