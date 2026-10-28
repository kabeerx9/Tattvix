import assert from "node:assert/strict";
import { test } from "node:test";
import type { GuestStay } from "@tattvix/contracts";
import { accessActivityLabel, describeGuestAccess, getGuestAccessAction, getGuestAccessSummary, groupAccessEvents, isHotelAccessOpen, formatPostCheckoutWindow } from "./guest-access";

const now = new Date("2026-10-27T12:00:00Z");
const at = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString();
function stay(overrides: Partial<GuestStay> = {}): GuestStay {
  return { id: "9f8e7d6c-5b4a-4c3d-8e2f-000000000001", status: "SUBMITTED", operationalStatus: "PENDING_CHECK_IN", room: null, submittedAt: at(-100), closedAt: null, checkedInAt: null, checkedOutAt: null, hotelAccessExpiresAt: null, ...overrides };
}
const format = (iso: string) => `<${iso}>`;

test("pending and checked-in stays remain open with no expiry or revoke action, including legacy expired deadlines", () => {
  for (const operationalStatus of ["PENDING_CHECK_IN", "CHECKED_IN"] as const) {
    for (const hotelAccessExpiresAt of [null, at(-90), at(1)]) {
      const action = getGuestAccessAction(stay({ operationalStatus, hotelAccessExpiresAt }), now);
      assert.deepEqual(action, { kind: "hidden", accessEndsBy: null });
      assert.equal(isHotelAccessOpen(action), true);
      assert.equal(describeGuestAccess(action), "The hotel can see your details during your stay and for 60 days after checkout. You can stop sharing after checkout.");
    }
  }
});
test("legacy identity-review closure does not end an in-house stay", () => {
  assert.equal(getGuestAccessAction(stay({ status: "CLOSED", operationalStatus: "CHECKED_IN", hotelAccessExpiresAt: at(-1) }), now).kind, "hidden");
});
test("checked out inside the window can revoke; actual expiry date is shown", () => {
  const action = getGuestAccessAction(stay({ status: "CLOSED", operationalStatus: "CHECKED_OUT", hotelAccessExpiresAt: at(59) }), now);
  assert.deepEqual(action, { kind: "revocable", accessEndsAt: at(59) });
  assert.equal(describeGuestAccess(action, { format }), `Hotel access ends <${at(59)}>. You can stop sharing now.`);
});
test("expiry boundary and missing checked-out deadline fail closed", () => {
  for (const hotelAccessExpiresAt of [null, at(-1), at(0)]) {
    const action = getGuestAccessAction(stay({ operationalStatus: "CHECKED_OUT", hotelAccessExpiresAt }), now);
    assert.deepEqual(action, { kind: "ended", reason: "expired", endedAt: hotelAccessExpiresAt });
    assert.equal(isHotelAccessOpen(action), false);
  }
});
test("revoked stays remain ended regardless of operational status", () => {
  for (const operationalStatus of ["PENDING_CHECK_IN", "CHECKED_IN", "CHECKED_OUT"] as const) {
    const action = getGuestAccessAction(stay({ status: "REVOKED", operationalStatus, hotelAccessExpiresAt: at(-2) }), now);
    assert.deepEqual(action, { kind: "ended", reason: "revoked", endedAt: at(-2) });
    assert.equal(describeGuestAccess(action, { format }), `You stopped sharing on <${at(-2)}>.`);
  }
});
test("drafts remain unshared", () => assert.deepEqual(getGuestAccessAction(stay({ status: "DRAFT" }), now), { kind: "not-shared" }));
test("post-checkout policy renders days rather than 1440 hours", () => {
  assert.equal(formatPostCheckoutWindow(1440), "60 days");
  assert.equal(formatPostCheckoutWindow(24), "1 day");
  assert.equal(formatPostCheckoutWindow(1), "1 hour");
  assert.equal(formatPostCheckoutWindow(2), "2 hours");
  assert.match(describeGuestAccess({ kind: "hidden", accessEndsBy: null }, { graceHours: 48 }), /2 days after checkout/);
});

test("access summary is one short line for a privacy row, open or ended", () => {
  assert.deepEqual(getGuestAccessSummary({ kind: "hidden", accessEndsBy: null }), { open: true, text: "Sharing while you stay" });
  assert.deepEqual(getGuestAccessSummary({ kind: "revocable", accessEndsAt: at(59) }, format), { open: true, text: `Sharing until <${at(59)}>` });
  assert.deepEqual(getGuestAccessSummary({ kind: "ended", reason: "revoked", endedAt: at(-2) }, format), { open: false, text: "You stopped sharing" });
  assert.deepEqual(getGuestAccessSummary({ kind: "ended", reason: "expired", endedAt: null }), { open: false, text: "Sharing ended" });
  assert.deepEqual(getGuestAccessSummary({ kind: "not-shared" }), { open: false, text: "Not shared" });
});

test("access events collapse per record, keeping the latest time", () => {
  const event = (action: "DETAILS_VIEWED" | "DOCUMENT_VIEWED", createdAt: string, imageSide: "FRONT" | "BACK" | null = null) =>
    ({ action, createdAt, imageSide, companionId: null, companionName: null }) as Parameters<typeof groupAccessEvents>[0][number];
  const groups = groupAccessEvents([event("DETAILS_VIEWED", at(-3)), event("DETAILS_VIEWED", at(-1)), event("DOCUMENT_VIEWED", at(-2), "BACK")]);
  assert.equal(groups.length, 2);
  assert.deepEqual({ count: groups[0]!.count, lastAt: groups[0]!.lastAt }, { count: 2, lastAt: at(-1) });
  assert.equal(accessActivityLabel(groups[0]!), "Opened your ID details");
  assert.equal(accessActivityLabel(groups[1]!), "Opened the back of your ID");
});
