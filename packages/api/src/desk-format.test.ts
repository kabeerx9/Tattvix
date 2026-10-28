import assert from "node:assert/strict";
import { test } from "node:test";
import type { HotelStayListItem } from "@tattvix/contracts";
import { formatDay, getReservationDetail, getTodayHeadline, partyLabel } from "./desk-format";

const today = "2026-10-28";
const stay = (patch: Partial<HotelStayListItem>) =>
  ({ operationalStatus: "CHECKED_IN", companionCount: 0, expectedCheckOutDate: null, submittedAt: null, checkedOutAt: null, ...patch }) as HotelStayListItem;

test("party label counts the guest plus companions", () => {
  assert.equal(partyLabel({ companionCount: 0 }), "1 guest");
  assert.equal(partyLabel({ companionCount: 2 }), "3 guests");
});

test("formatDay says today for the current day", () => {
  assert.equal(formatDay(today, today), "Today");
  assert.equal(formatDay(today, today, true), "today");
  assert.equal(formatDay(null, today), "—");
});

test("reservation detail shows room and due-out, flagging overdue stays", () => {
  assert.deepEqual(getReservationDetail(stay({ expectedCheckOutDate: today }), "302", today), { text: "Room 302 · due out today", overdue: false });
  const late = getReservationDetail(stay({ expectedCheckOutDate: "2026-10-26" }), "302", today);
  assert.equal(late.overdue, true);
  assert.match(late.text, /^Room 302 · overdue, due out /);
  assert.deepEqual(getReservationDetail(stay({}), null, today), { text: "No room yet · no checkout date", overdue: false });
});

test("waiting guests show party size and when they checked in on their phone", () => {
  const detail = getReservationDetail(stay({ operationalStatus: "PENDING_CHECK_IN", companionCount: 1, submittedAt: null }), null, today);
  assert.deepEqual(detail, { text: "2 guests · checked in on phone —", overdue: false });
});

test("today headline leads with whatever needs the desk first", () => {
  assert.deepEqual(getTodayHeadline({ waiting: 3, checkingOut: 2, checkedIn: 10 }), { title: "3 guests need a room", detail: "2 checking out · 10 checked in" });
  assert.deepEqual(getTodayHeadline({ waiting: 1, checkingOut: 0, checkedIn: 0 }), { title: "1 guest needs a room", detail: "No one else at the desk yet" });
  assert.deepEqual(getTodayHeadline({ waiting: 0, checkingOut: 1, checkedIn: 4 }), { title: "1 checking out today", detail: "4 checked in" });
  assert.deepEqual(getTodayHeadline({ waiting: 0, checkingOut: 0, checkedIn: 0 }), { title: "All quiet at the desk", detail: "New check-ins appear here as guests scan your QR" });
});
