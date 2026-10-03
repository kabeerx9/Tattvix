import assert from "node:assert/strict";
import test from "node:test";

import {
  hotelGuestListResponseSchema,
  hotelOverviewSummaryResponseSchema,
  hotelReportOccupancyResponseSchema,
  hotelReportRegisterResponseSchema,
  hotelRoomCreateInputSchema,
} from "./hotel-operations";

test("room creation trims operational inventory fields", () => {
  assert.deepEqual(
    hotelRoomCreateInputSchema.parse({
      number: " 101 ",
      floor: " 1 ",
      roomType: " Deluxe ",
    }),
    { number: "101", floor: "1", roomType: "Deluxe" },
  );
});

test("current guest records require a real operational room assignment", () => {
  const result = hotelGuestListResponseSchema.safeParse({
    current: [
      {
        id: "f1d6e5c4-b3a2-4987-8123-123456789abc",
        guestName: "Kabeer Joshi",
        companionCount: 1,
        operationalStatus: "CHECKED_IN",
        room: {
          id: 1,
          number: "101",
          floor: "1",
          roomType: "Deluxe",
          status: "OCCUPIED",
          isActive: true,
        },
        checkedInAt: "2026-07-18T12:00:00Z",
        checkedOutAt: null,
      },
    ],
    history: [],
  });

  assert.equal(result.success, true);
});

test("register entries carry only names/dates/room/status, never document data", () => {
  const result = hotelReportRegisterResponseSchema.safeParse({
    dateFrom: "2026-08-08",
    dateTo: "2026-08-08",
    entries: [
      {
        stayId: "f1d6e5c4-b3a2-4987-8123-123456789abc",
        guestName: "Kabeer Joshi",
        companionCount: 1,
        roomNumber: "101",
        checkedInAt: "2026-08-08T09:00:00Z",
        checkedOutAt: null,
        operationalStatus: "CHECKED_IN",
      },
    ],
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(Object.keys(result.data.entries[0]!), [
      "stayId",
      "guestName",
      "companionCount",
      "roomNumber",
      "checkedInAt",
      "checkedOutAt",
      "operationalStatus",
    ]);
  }
});

test("occupancy response tracks all four room statuses", () => {
  const result = hotelReportOccupancyResponseSchema.safeParse({
    occupiedRooms: 3,
    activeRooms: 5,
    statusCounts: {
      VACANT: 1,
      OCCUPIED: 3,
      CLEANING: 1,
      MAINTENANCE: 0,
    },
  });

  assert.equal(result.success, true);
});


const overview = {
  dateFrom: "2026-10-01", dateTo: "2026-10-03", activeRooms: 24,
  occupancy: [{ date: "2026-10-01", occupiedRooms: 9 }],
  revenue: { totalMinor: 350000, byDay: [{ date: "2026-10-01", amountMinor: 350000 }] },
};

test("overview summary accepts revenue and reception's null revenue", () => {
  assert.deepEqual(hotelOverviewSummaryResponseSchema.parse(overview), overview);
  assert.equal(hotelOverviewSummaryResponseSchema.parse({ ...overview, revenue: null }).revenue, null);
});

test("overview summary rejects negative revenue totals and daily amounts", () => {
  assert.equal(hotelOverviewSummaryResponseSchema.safeParse({ ...overview,
    revenue: { ...overview.revenue, totalMinor: -1 },
  }).success, false);
  assert.equal(hotelOverviewSummaryResponseSchema.safeParse({ ...overview,
    revenue: { totalMinor: 0, byDay: [{ date: "2026-10-01", amountMinor: -1 }] },
  }).success, false);
});
