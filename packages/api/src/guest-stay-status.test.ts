import assert from "node:assert/strict";
import { test } from "node:test";
import { getCurrentGuestStay, getGuestKeyCard, stayStatusLabel, getGuestStayFacts } from "./guest-stay-status";
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
    { label: "Room", value: "Reception will assign one", icon: "room" },
    { label: "Requested", value: "<2026-10-27T09:00:00Z>", icon: "requested" },
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

test("guest key card: front and back text, and who has opened the guest's ID", () => {
  const stay = {
    operationalStatus: "CHECKED_IN",
    property: { name: "Sunrise Jaipur", details: { address: "14 MI Road, Jaipur", contactPhone: "+911412345678", checkInTime: "14:00", checkOutTime: "11:00" } },
    room: { number: "204" },
    submittedAt: "2026-10-27T09:00:00Z",
    checkedInAt: "2026-10-27T09:42:00Z",
    accessEvents: [
      { action: "DETAILS_VIEWED", createdAt: "2026-10-27T09:40:00Z" },
      { action: "STAY_CLOSED", createdAt: "2026-10-27T09:50:00Z" },
      { action: "DOCUMENT_VIEWED", createdAt: "2026-10-28T08:14:00Z" },
    ],
  } as never;
  const card = getGuestKeyCard(stay, (iso) => `<${iso}>`);
  assert.equal(card.hotel, "Sunrise Jaipur");
  assert.equal(card.status, "Checked in");
  assert.equal(card.tone, "success");
  assert.equal(card.room, "204");
  assert.deepEqual(card.since, { label: "Checked in", when: "<2026-10-27T09:42:00Z>" });
  assert.match(card.checkOut ?? "", /^11:00\s?am$/i);
  assert.match(card.checkIn ?? "", /^2:00\s?pm$/i);
  assert.equal(card.address, "14 MI Road, Jaipur");
  assert.equal(card.phone, "+911412345678");
  assert.equal(card.idViews, "Reception opened your ID 2 times, last <2026-10-28T08:14:00Z>");

  const waiting = getGuestKeyCard(
    { ...(stay as object), operationalStatus: "PENDING_CHECK_IN", room: null, checkedInAt: null, accessEvents: [], property: { name: "Sunrise Jaipur" } } as never,
    (iso) => `<${iso}>`,
  );
  assert.equal(waiting.tone, "warning");
  assert.equal(waiting.room, null);
  assert.deepEqual(waiting.since, { label: "Requested", when: "<2026-10-27T09:00:00Z>" });
  assert.equal(waiting.checkOut, null);
  assert.equal(waiting.address, null);
  assert.equal(waiting.phone, null);
  assert.equal(waiting.idViews, "Reception hasn't opened your ID yet");
});

test("guest key card: one view reads in the singular", () => {
  const card = getGuestKeyCard(
    { operationalStatus: "CHECKED_IN", property: { name: "A" }, room: null, submittedAt: null, checkedInAt: null, accessEvents: [{ action: "DETAILS_VIEWED", createdAt: "x" }] } as never,
    (iso) => iso,
  );
  assert.equal(card.idViews, "Reception opened your ID once, last x");
  assert.equal(card.since, null);
});
