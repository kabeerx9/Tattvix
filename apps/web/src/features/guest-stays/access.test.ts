import assert from "node:assert/strict";
import { test } from "node:test";

import type { GuestStay } from "@tattvix/contracts";

import { describeGuestAccess, getGuestAccessAction, isHotelAccessOpen } from "./access";

const now = new Date("2026-10-22T12:00:00.000Z");
const hoursFromNow = (hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString();
const sevenDayCap = hoursFromNow(24 * 6);

function stay(overrides: Partial<GuestStay>): GuestStay {
  return {
    id: "9f8e7d6c-5b4a-4c3d-8e2f-000000000001",
    status: "SUBMITTED",
    operationalStatus: "PENDING_CHECK_IN",
    room: null,
    submittedAt: hoursFromNow(-24),
    closedAt: null,
    checkedInAt: null,
    checkedOutAt: null,
    hotelAccessExpiresAt: sevenDayCap,
    ...overrides,
  };
}

const format = (iso: string) => `<${iso}>`;

test("sent and waiting for a room: no revoke action, explains the window", () => {
  const action = getGuestAccessAction(stay({}), now);
  assert.deepEqual(action, { kind: "hidden", accessEndsBy: sevenDayCap });
  assert.equal(isHotelAccessOpen(action), true);
  assert.equal(
    describeGuestAccess(action, { graceHours: 24, format }),
    "The hotel can see your details during your stay. You can stop sharing after checkout; access ends automatically 24 hours after checkout.",
  );
});

test("pending with a room already assigned is still an active stay", () => {
  const action = getGuestAccessAction(stay({ room: { id: 4, number: "204" } }), now);
  assert.equal(action.kind, "hidden");
});

test("checked in: no revoke action", () => {
  const action = getGuestAccessAction(
    stay({ operationalStatus: "CHECKED_IN", room: { id: 4, number: "204" }, checkedInAt: hoursFromNow(-20) }),
    now,
  );
  assert.deepEqual(action, { kind: "hidden", accessEndsBy: sevenDayCap });
});

test("active stay without the policy falls back to the cap date", () => {
  const action = getGuestAccessAction(stay({ operationalStatus: "CHECKED_IN" }), now);
  assert.equal(
    describeGuestAccess(action, { format }),
    `The hotel can see your details during your stay. You can stop sharing after checkout; access ends automatically after checkout, and no later than <${sevenDayCap}>.`,
  );
});

test("checked out inside the window: revocable until checkout + grace", () => {
  const endsAt = hoursFromNow(20);
  const action = getGuestAccessAction(
    stay({
      status: "CLOSED",
      operationalStatus: "CHECKED_OUT",
      checkedOutAt: hoursFromNow(-4),
      closedAt: hoursFromNow(-4),
      hotelAccessExpiresAt: endsAt,
    }),
    now,
  );
  assert.deepEqual(action, { kind: "revocable", accessEndsAt: endsAt });
  assert.equal(isHotelAccessOpen(action), true);
  assert.equal(describeGuestAccess(action, { format }), `Hotel access ends <${endsAt}>. You can stop sharing now.`);
});

test("checked out after the window: access ended, no button, past date shown as ended", () => {
  const endedAt = hoursFromNow(-2);
  const action = getGuestAccessAction(
    stay({
      status: "CLOSED",
      operationalStatus: "CHECKED_OUT",
      checkedOutAt: hoursFromNow(-26),
      hotelAccessExpiresAt: endedAt,
    }),
    now,
  );
  assert.deepEqual(action, { kind: "ended", reason: "expired", endedAt });
  assert.equal(isHotelAccessOpen(action), false);
  assert.equal(describeGuestAccess(action, { format }), `Access ended on <${endedAt}>.`);
});

test("access ending exactly now counts as ended", () => {
  const action = getGuestAccessAction(
    stay({ status: "CLOSED", operationalStatus: "CHECKED_OUT", hotelAccessExpiresAt: now.toISOString() }),
    now,
  );
  assert.equal(action.kind, "ended");
});

test("hotel closed its identity review before checkout: window is counting down, revocable", () => {
  const endsAt = hoursFromNow(10);
  const action = getGuestAccessAction(
    stay({ status: "CLOSED", operationalStatus: "CHECKED_IN", hotelAccessExpiresAt: endsAt }),
    now,
  );
  assert.deepEqual(action, { kind: "revocable", accessEndsAt: endsAt });
});

test("a long stay past the maximum-days cap: access already ended while in house", () => {
  const endedAt = hoursFromNow(-1);
  const action = getGuestAccessAction(stay({ operationalStatus: "CHECKED_IN", hotelAccessExpiresAt: endedAt }), now);
  assert.deepEqual(action, { kind: "ended", reason: "expired", endedAt });
});

test("already revoked: ended by the guest, during or after the stay", () => {
  const revokedAt = hoursFromNow(-3);
  for (const operationalStatus of ["PENDING_CHECK_IN", "CHECKED_IN", "CHECKED_OUT"] as const) {
    const action = getGuestAccessAction(
      stay({ status: "REVOKED", operationalStatus, hotelAccessExpiresAt: revokedAt }),
      now,
    );
    assert.deepEqual(action, { kind: "ended", reason: "revoked", endedAt: revokedAt });
    assert.equal(describeGuestAccess(action, { format }), `You stopped sharing on <${revokedAt}>.`);
  }
  assert.equal(
    describeGuestAccess(getGuestAccessAction(stay({ status: "REVOKED", hotelAccessExpiresAt: null }), now)),
    "You stopped sharing.",
  );
});

test("missing expiry is treated as no access", () => {
  const action = getGuestAccessAction(stay({ hotelAccessExpiresAt: null }), now);
  assert.deepEqual(action, { kind: "ended", reason: "expired", endedAt: null });
  assert.equal(describeGuestAccess(action), "Access has ended.");
});

test("draft is not shared", () => {
  assert.deepEqual(getGuestAccessAction(stay({ status: "DRAFT" }), now), { kind: "not-shared" });
});

test("singular grace hour", () => {
  const action = getGuestAccessAction(stay({}), now);
  assert.match(describeGuestAccess(action, { graceHours: 1 }), /1 hour after checkout\.$/);
});
