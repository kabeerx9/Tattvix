import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { MeResponse, Membership } from "@tattvix/contracts";

import { describeHotelPlace, findHotelPlace, getHotelPlaces, getLanding, isReadOnly } from "./workspace";

const subscription = {
  status: "TRIALING",
  entitled: true,
  trialEndsAt: "2026-12-08T00:00:00Z",
  paidUntil: null,
  entitledUntil: "2026-12-08T00:00:00Z",
  daysLeft: 45,
} as const;

function membership(overrides: Partial<Membership> & Pick<Membership, "organization" | "properties">): Membership {
  return {
    id: 1,
    role: "OWNER",
    hasAllProperties: true,
    permissions: ["hotel:view", "hotel:manage", "stays:view", "stays:update", "rooms:view", "rooms:manage", "rooms:assign", "reports:view", "members:view", "members:manage"],
    subscription,
    ...overrides,
  };
}

function me(memberships: Membership[]): MeResponse {
  return {
    id: 1,
    clerkId: "user_1",
    email: "a@example.com",
    firstName: "A",
    lastName: "B",
    username: "",
    imageUrl: "",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    lastSyncedAt: null,
    platformRole: null,
    platformPermissions: [],
    memberships,
  };
}

const sunrise = { id: 10, name: "Sunrise Hospitality", slug: "sunrise" };
const jaipur = { id: 1, name: "Sunrise Jaipur", slug: "jaipur" };
const udaipur = { id: 2, name: "Sunrise Udaipur", slug: "udaipur" };

const owner = me([membership({ organization: sunrise, properties: [jaipur, udaipur] })]);
const reception = me([membership({ id: 2, role: "RECEPTION", hasAllProperties: false, permissions: ["hotel:view", "stays:view", "stays:update", "rooms:view", "rooms:assign"], organization: sunrise, properties: [udaipur] })]);
const guest = me([]);

describe("getHotelPlaces", () => {
  it("lists every property of every membership with hotel:view, in order", () => {
    assert.deepEqual(getHotelPlaces(owner).map((p) => p.key), ["property:1", "property:2"]);
  });
  it("skips memberships without hotel:view and organizations with no property", () => {
    const noView = me([membership({ permissions: ["stays:view"], organization: sunrise, properties: [jaipur] }), membership({ id: 3, organization: { id: 11, name: "Empty Org", slug: "empty" }, properties: [] })]);
    assert.deepEqual(getHotelPlaces(noView), []);
  });
  it("returns nothing for a signed-out user", () => {
    assert.deepEqual(getHotelPlaces(null), []);
  });
});

describe("getLanding", () => {
  it("sends members to their last-used hotel when they still have it", () => {
    const landing = getLanding(owner, "property:2");
    assert.equal(landing.kind, "hotel");
    assert.equal(landing.kind === "hotel" && landing.place.propertySlug, "udaipur");
  });
  it("falls back to the first hotel when the last-used one is gone", () => {
    const landing = getLanding(owner, "property:99");
    assert.equal(landing.kind === "hotel" && landing.place.propertySlug, "jaipur");
  });
  it("uses the first hotel when nothing was remembered", () => {
    const landing = getLanding(reception, null);
    assert.equal(landing.kind === "hotel" && landing.place.propertySlug, "udaipur");
  });
  it("sends people with no hotel to guest mode, whatever was remembered", () => {
    assert.deepEqual(getLanding(guest, "property:1"), { kind: "guest" });
    assert.deepEqual(getLanding(null, null), { kind: "guest" });
  });
});

describe("findHotelPlace", () => {
  it("finds the hotel a route names", () => {
    assert.equal(findHotelPlace(owner, "sunrise", "udaipur")?.key, "property:2");
  });
  it("returns null for a hotel the person cannot open or a partial route", () => {
    assert.equal(findHotelPlace(reception, "sunrise", "jaipur"), null);
    assert.equal(findHotelPlace(owner, "sunrise", undefined), null);
    assert.equal(findHotelPlace(owner, "other", "jaipur"), null);
  });
});

describe("describeHotelPlace and isReadOnly", () => {
  it("shows the organization only when it differs from the property name", () => {
    const [jaipurPlace] = getHotelPlaces(owner);
    assert.equal(describeHotelPlace(jaipurPlace!), "Sunrise Hospitality · Owner");
    const same = getHotelPlaces(me([membership({ organization: { id: 1, name: "Sunrise Jaipur", slug: "sj" }, properties: [jaipur] })]))[0]!;
    assert.equal(describeHotelPlace(same), "Owner");
  });
  it("marks an expired subscription read-only", () => {
    const expired = getHotelPlaces(me([membership({ organization: sunrise, properties: [jaipur], subscription: { ...subscription, status: "EXPIRED", entitled: false, daysLeft: 0 } })]))[0]!;
    assert.equal(isReadOnly(expired), true);
    assert.equal(isReadOnly(getHotelPlaces(owner)[0]!), false);
  });
});
