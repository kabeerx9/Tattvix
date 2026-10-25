import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { HotelPlace } from "./workspace";
import { getDeskScope } from "./desk-scope";

const subscription = { status: "TRIALING", entitled: true, trialEndsAt: null, paidUntil: null, entitledUntil: null, daysLeft: 10 } as const;

function place(permissions: string[], entitled = true): HotelPlace {
  return {
    key: "property:1",
    organizationSlug: "sunrise",
    organizationName: "Sunrise",
    propertySlug: "jaipur",
    propertyName: "Jaipur",
    role: "RECEPTION",
    permissions: permissions as HotelPlace["permissions"],
    subscription: { ...subscription, entitled, status: entitled ? "TRIALING" : "EXPIRED" },
  };
}

describe("getDeskScope", () => {
  it("maps permissions to desk actions", () => {
    const scope = getDeskScope(place(["hotel:view", "rooms:assign", "stays:update"]));
    assert.equal(scope.canAssign, true);
    assert.equal(scope.canCheckout, true);
    assert.equal(scope.canManageRooms, false);
    assert.equal(scope.readOnly, false);
  });
  it("pauses every write except checkout when the subscription lapsed", () => {
    const scope = getDeskScope(place(["hotel:view", "rooms:assign", "stays:update", "rooms:manage"], false));
    assert.deepEqual([scope.readOnly, scope.canAssign, scope.canManageRooms, scope.canCheckout], [true, false, false, true]);
  });
});
