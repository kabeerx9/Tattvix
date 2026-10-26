import assert from "node:assert/strict";
import { test } from "node:test";
import type { Membership } from "@tattvix/contracts";
import { getAccountSettings } from "./account-settings";

function membership(overrides: Partial<Membership> = {}): Membership {
  return {
    id: 1, role: "OWNER", hasAllProperties: true,
    permissions: ["hotel:view", "hotel:manage"],
    organization: { id: 1, name: "Jaipur Hotels", slug: "jaipur-hotels" },
    properties: [{ id: 1, name: "Jaipur House", slug: "house" }],
    subscription: { status: "TRIALING", entitled: true, daysLeft: 1, trialEndsAt: "2026-12-01T00:00:00Z", entitledUntil: "2026-12-01T00:00:00Z", paidUntil: null },
    ...overrides,
  };
}

test("guests and staff do not receive owner settings; permissions are authoritative", () => {
  assert.equal(getAccountSettings(null).isOwner, false);
  assert.deepEqual(getAccountSettings({ memberships: [] }).hotels, []);
  for (const role of ["MANAGER", "RECEPTION", "OWNER"] as const) {
    assert.equal(getAccountSettings({ memberships: [membership({ role, permissions: ["hotel:view"] })] }).isOwner, false);
  }
  assert.equal(getAccountSettings({ memberships: [membership({ permissions: ["hotel:manage"] })] }).isOwner, false);
});

test("owners see only authorized properties across all owned organizations, including expired hotels", () => {
  const first = membership();
  const second = membership({ id: 2, organization: { id: 2, name: "Delhi Hotels", slug: "delhi" }, properties: [{ id: 5, name: "Delhi House", slug: "house" }], subscription: { ...first.subscription, status: "EXPIRED", entitled: false, daysLeft: 0 } });
  const model = getAccountSettings({ memberships: [first, membership({ role: "MANAGER", permissions: ["hotel:view"] }), second] });
  assert.equal(model.isOwner, true);
  assert.deepEqual(model.hotels.map((hotel) => hotel.organization.slug), ["jaipur-hotels", "delhi"]);
  assert.deepEqual(model.hotels[0]?.properties, first.properties);
  assert.equal(model.hotels[0]?.subscriptionLabel, "Free trial · 1 day left");
  assert.equal(model.hotels[1]?.subscriptionLabel, "Subscription expired");
});

test("owners without accessible properties stay owners; missing and paid subscriptions have honest labels", () => {
  const owner = membership({ properties: [], hasAllProperties: false });
  const missing = getAccountSettings({ memberships: [{ ...owner, subscription: { ...owner.subscription, status: "MISSING", entitled: false } }] });
  assert.equal(missing.isOwner, true);
  assert.deepEqual(missing.hotels[0]?.properties, []);
  assert.equal(missing.hotels[0]?.subscriptionLabel, "Subscription unavailable");
  const paid = getAccountSettings({ memberships: [{ ...owner, subscription: { ...owner.subscription, status: "PAID" } }] });
  assert.equal(paid.hotels[0]?.subscriptionLabel, "Subscription active");
});
