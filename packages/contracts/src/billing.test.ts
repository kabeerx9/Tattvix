import assert from "node:assert/strict";
import { test } from "node:test";
import {
  stayBillChargeInputSchema,
  stayBillSchema,
  propertyDetailsInputSchema,
} from "./billing";
import {
  hotelStayCheckInInputSchema,
  hotelRoomCreateInputSchema,
  hotelRoomRateInputSchema,
} from "./hotel-operations";
const requestId = "11111111-1111-4111-8111-111111111111";
test("bill items accept whole paise and reject client authority or fractional prices", () => {
  const item = {
    requestId,
    description: " Tea ",
    quantity: 2,
    unitPriceMinor: 2550,
  };
  assert.equal(stayBillChargeInputSchema.parse(item).description, "Tea");
  for (const patch of [
    { unitPriceMinor: 25.5 },
    { unitPriceMinor: -1 },
    { quantity: 0 },
    { quantity: 1.5 },
    { kind: "ROOM" },
    { totalMinor: 1 },
    { guestId: 2 },
  ])
    assert.equal(
      stayBillChargeInputSchema.safeParse({ ...item, ...patch }).success,
      false,
    );
});
test("room price can be unset but reception nights are whole bounded counts", () => {
  assert.equal(
    hotelRoomRateInputSchema.safeParse({ nightlyRateMinor: null }).success,
    true,
  );
  assert.equal(
    hotelRoomCreateInputSchema.parse({
      number: "101",
      floor: "",
      roomType: "",
      nightlyRateMinor: 250000,
    }).nightlyRateMinor,
    250000,
  );
  assert.equal(
    hotelStayCheckInInputSchema.parse({ roomId: 1, nights: 3 }).nights,
    3,
  );
  for (const nights of [0, 1.5, 366])
    assert.equal(
      hotelStayCheckInInputSchema.safeParse({ roomId: 1, nights }).success,
      false,
    );
});
test("guest bill separates voided lines from the server-computed total", () => {
  const bill = stayBillSchema.parse({
    currency: "INR",
    isFinal: false,
    roomNights: 2,
    nightlyRateMinor: 250000,
    totalMinor: 500000,
    items: [
      {
        id: requestId,
        kind: "EXTRA",
        description: "Tea",
        quantity: 1,
        unitPriceMinor: 5000,
        lineTotalMinor: 5000,
        createdAt: "2026-10-03T10:00:00Z",
        voidedAt: "2026-10-03T11:00:00Z",
        voidReason: "Entered twice",
      },
    ],
  });
  assert.equal(bill.items[0]?.voidReason, "Entered twice");
  assert.equal(
    stayBillSchema.safeParse({ ...bill, totalMinor: 1.5 }).success,
    false,
  );
});
test("hotel details edits cannot publish inventory or choose billing currency", () => {
  const details = {
    address: "Jaipur",
    contactPhone: "+91 9876543210",
    description: "Walk-in hotel",
    amenities: ["Wi-Fi"],
    checkInTime: "14:00",
    checkOutTime: "11:00",
  };
  assert.equal(propertyDetailsInputSchema.safeParse(details).success, true);
  for (const patch of [
    { availableRooms: 5 },
    { currency: "USD" },
    { checkInTime: "25:00" },
    { contactPhone: "not a phone" },
  ])
    assert.equal(
      propertyDetailsInputSchema.safeParse({ ...details, ...patch }).success,
      false,
    );
});
