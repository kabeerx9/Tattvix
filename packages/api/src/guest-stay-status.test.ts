import assert from "node:assert/strict";
import { test } from "node:test";
import { getCurrentGuestStay, stayStatusLabel, getGuestStayFacts } from "./guest-stay-status";
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

test("stay facts: room, the moments that happened, and nights with the rate", () => {
  const base = { room: null, submittedAt: "2026-10-27T09:00:00Z", checkedInAt: null, checkedOutAt: null } as const;
  const waiting = getGuestStayFacts(base, null, (iso) => `<${iso}>`);
  assert.deepEqual(waiting, [
    { label: "Room", value: "Reception will assign one" },
    { label: "Requested", value: "<2026-10-27T09:00:00Z>" },
  ]);
  const done = getGuestStayFacts(
    { ...base, room: { number: "302" } as never, checkedInAt: "2026-10-27T10:00:00Z", checkedOutAt: "2026-10-29T10:00:00Z" },
    { roomNights: 2, nightlyRateMinor: 450000 },
    (iso) => `<${iso}>`,
  );
  assert.deepEqual(done.map((fact) => fact.label), ["Room", "Checked in", "Checked out", "Nights"]);
  assert.equal(done[0]!.value, "Room 302");
  assert.match(done[3]!.value!, /^2 nights at ₹4,500(\.00)? a night$/);
});
