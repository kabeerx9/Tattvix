import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { HotelRoom, HotelStayListItem } from "@tattvix/contracts";

import {
  countArrivalsToday,
  countDeparturesToday,
  getLeavingToday,
  getOccupancyTrend,
  getDailyMovement,
  getInHouse,
  getNeedsAction,
  getRoomStats,
  localDayKey,
} from "./metrics";

function room(id: number, status: HotelRoom["status"], isActive = true): HotelRoom {
  return { id, number: String(100 + id), floor: "1", roomType: "Deluxe", status, isActive, nightlyRateMinor: 350000 };
}

// Midday local times keep these tests independent of the machine's time zone.
function at(day: string, time = "12:00") {
  return new Date(`${day}T${time}:00`).toISOString();
}

function stay(
  id: string,
  operationalStatus: HotelStayListItem["operationalStatus"],
  extra: Partial<HotelStayListItem> = {},
): HotelStayListItem {
  return {
    id,
    status: "ACTIVE",
    operationalStatus,
    room: null,
    submittedAt: at("2026-10-01"),
    closedAt: null,
    checkedInAt: null,
    checkedOutAt: null,
    expectedCheckOutDate: null,
    hotelAccessExpiresAt: null,
    guestName: `Guest ${id}`,
    companionCount: 0,
    identityAccess: { isActive: true, reason: "ACTIVE", expiresAt: null },
    ...extra,
  } as unknown as HotelStayListItem;
}

const today = new Date("2026-10-03T12:00:00");

describe("room stats", () => {
  it("counts active rooms by status and computes occupancy", () => {
    const stats = getRoomStats([room(1, "OCCUPIED"), room(2, "OCCUPIED"), room(3, "VACANT"), room(4, "CLEANING")]);
    assert.deepEqual(stats, { active: 4, occupied: 2, vacant: 1, cleaning: 1, maintenance: 0, occupancyPercent: 50 });
  });
  it("ignores inactive rooms", () => {
    const stats = getRoomStats([room(1, "OCCUPIED"), room(2, "VACANT", false)]);
    assert.equal(stats.active, 1);
    assert.equal(stats.occupancyPercent, 100);
  });
  it("zero active rooms gives 0%, not NaN", () => {
    assert.equal(getRoomStats([]).occupancyPercent, 0);
  });
});

describe("daily movement", () => {
  it("returns one entry per day ending today, oldest first", () => {
    const days = getDailyMovement([], today, 7);
    assert.equal(days.length, 7);
    assert.equal(days[0]!.day, "2026-09-27");
    assert.equal(days[6]!.day, "2026-10-03");
  });
  it("counts arrivals by check-in day and departures by check-out day", () => {
    const stays = [
      stay("a", "CHECKED_IN", { checkedInAt: at("2026-10-03") }),
      stay("b", "CHECKED_OUT", { checkedInAt: at("2026-10-01"), checkedOutAt: at("2026-10-03") }),
      stay("c", "CHECKED_IN", { checkedInAt: at("2026-09-01") }),
    ];
    const days = getDailyMovement(stays, today, 7);
    assert.deepEqual(days.at(-1), { day: "2026-10-03", label: days.at(-1)!.label, arrivals: 1, departures: 1 });
    assert.equal(days.find((d) => d.day === "2026-10-01")!.arrivals, 1);
    assert.equal(days.reduce((sum, d) => sum + d.arrivals, 0), 2);
  });
  it("no stays gives zero counts", () => {
    assert.ok(getDailyMovement([], today, 7).every((d) => d.arrivals === 0 && d.departures === 0));
  });
});

describe("needs action and in-house", () => {
  const stays = [
    stay("late", "PENDING_CHECK_IN", { submittedAt: at("2026-10-03", "11:00") }),
    stay("early", "PENDING_CHECK_IN", { submittedAt: at("2026-10-03", "09:00") }),
    stay("in1", "CHECKED_IN", { checkedInAt: at("2026-10-01") }),
    stay("in2", "CHECKED_IN", { checkedInAt: at("2026-10-03") }),
    stay("out", "CHECKED_OUT", { checkedInAt: at("2026-09-30"), checkedOutAt: at("2026-10-02") }),
  ];
  it("lists pending check-ins oldest submission first and active rooms needing cleaning", () => {
    const result = getNeedsAction(stays, [room(1, "CLEANING"), room(2, "CLEANING", false), room(3, "VACANT")]);
    assert.deepEqual(result.waiting.map((s) => s.id), ["early", "late"]);
    assert.deepEqual(result.toClean.map((r) => r.id), [1]);
  });
  it("lists checked-in stays, most recent check-in first", () => {
    assert.deepEqual(getInHouse(stays).map((s) => s.id), ["in2", "in1"]);
  });
  it("counts arrivals today", () => {
    assert.equal(countArrivalsToday(stays, today), 1);
  });
  it("local day key is YYYY-MM-DD", () => {
    assert.equal(localDayKey(new Date("2026-10-03T12:00:00")), "2026-10-03");
  });
});


describe("departures due", () => {
  const stays = [
    stay("today-z", "CHECKED_IN", { expectedCheckOutDate: "2026-10-03", guestName: "Zara" }),
    stay("overdue", "CHECKED_IN", { expectedCheckOutDate: "2026-10-02" }),
    stay("today-a", "CHECKED_IN", { expectedCheckOutDate: "2026-10-03", guestName: "Amara" }),
    stay("future", "CHECKED_IN", { expectedCheckOutDate: "2026-10-04" }),
    stay("unknown", "CHECKED_IN"),
    stay("pending", "PENDING_CHECK_IN", { expectedCheckOutDate: "2026-10-02" }),
    stay("done", "CHECKED_OUT", { expectedCheckOutDate: "2026-10-03", checkedOutAt: at("2026-10-03") }),
    stay("yesterday", "CHECKED_OUT", { checkedOutAt: at("2026-10-02") }),
  ];
  it("excludes null dates, future and other statuses; sorts overdue then date and name", () => {
    assert.deepEqual(getLeavingToday(stays, today).map((stay) => stay.id), ["overdue", "today-a", "today-z"]);
  });
  it("counts completed departures separately from due and overdue", () => {
    assert.deepEqual(countDeparturesToday(stays, today), { done: 1, due: 3 });
  });
  it("empty stays have no departures", () => {
    assert.deepEqual(countDeparturesToday([], today), { done: 0, due: 0 });
  });
});

describe("occupancy trend", () => {
  const summary = {
    dateFrom: "2026-10-01", dateTo: "2026-10-03", activeRooms: 3,
    occupancy: [{ date: "2026-10-01", occupiedRooms: 1 }, { date: "2026-10-03", occupiedRooms: 2 }],
    revenue: null,
  };
  it("rounds percentages and retains calendar dates and ordering", () => {
    assert.deepEqual(getOccupancyTrend(summary), [
      { date: "2026-10-01", label: "Thu 1", percent: 33 },
      { date: "2026-10-03", label: "Sat 3", percent: 67 },
    ]);
  });
  it("zero active rooms gives zero percent", () => {
    assert.ok(getOccupancyTrend({ ...summary, activeRooms: 0 }).every((entry) => entry.percent === 0));
  });
});
