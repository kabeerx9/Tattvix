import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlatformPortfolioProperty, Subscription } from "@tattvix/contracts";

import { formatPercent, getMissingSetup, getPortfolioTotals, getSetupStatus } from "./platform-metrics";

const TRIAL: Subscription = {
  status: "TRIALING",
  entitled: true,
  trialEndsAt: "2026-12-08T00:00:00Z",
  paidUntil: null,
  entitledUntil: "2026-12-08T00:00:00Z",
  daysLeft: 45,
};

function property(overrides: Partial<PlatformPortfolioProperty> & { id: number; name: string }): PlatformPortfolioProperty {
  return {
    slug: overrides.name.toLowerCase(),
    isActive: true,
    address: "",
    coverPhotoUrl: null,
    organization: { name: "Tattwix Hotels", slug: "tattwix-hotels", isActive: true, activeMemberCount: 1, subscription: TRIAL },
    onboarding: { source: "ADMIN", onboardedAt: "2026-10-01T00:00:00+00:00" },
    setup: { hasAddress: true, hasCoverPhoto: true, hasRooms: true, hasRates: true },
    rooms: { total: 0, occupied: 0, ready: 0, cleaning: 0, maintenance: 0 },
    rates: { minMinor: null, avgMinor: null, maxMinor: null },
    roomTypes: [],
    occupancy: { recentNights: 7, recentOccupiedRoomNights: 0, recentAvailableRoomNights: 0 },
    stays: { inHouse: 0, arrivalsPending: 0, checkInsLast7Days: 0 },
    revenueLast30DaysMinor: 0,
    lastActivityAt: null,
    ...overrides,
  };
}

const jaipur = property({
  id: 1,
  name: "Jaipur",
  address: "MI Road, Jaipur",
  rooms: { total: 10, occupied: 9, ready: 1, cleaning: 0, maintenance: 0 },
  occupancy: { recentNights: 7, recentOccupiedRoomNights: 56, recentAvailableRoomNights: 70 },
  stays: { inHouse: 9, arrivalsPending: 2, checkInsLast7Days: 12 },
  revenueLast30DaysMinor: 5_000_000,
});
const goa = property({
  id: 2,
  name: "Goa",
  organization: { name: "Other Stays", slug: "other-stays", isActive: true, activeMemberCount: 3, subscription: TRIAL },
  rooms: { total: 90, occupied: 9, ready: 70, cleaning: 10, maintenance: 1 },
  occupancy: { recentNights: 7, recentOccupiedRoomNights: 63, recentAvailableRoomNights: 630 },
  revenueLast30DaysMinor: 9_000_000,
});
const empty = property({ id: 3, name: "Agra", setup: { hasAddress: false, hasCoverPhoto: false, hasRooms: false, hasRates: false } });

describe("portfolio totals", () => {
  it("counts hotels and organizations and weights occupancy by rooms across two properties", () => {
    const totals = getPortfolioTotals([jaipur, goa, empty]);
    assert.equal(totals.properties, 3);
    assert.equal(totals.organizations, 2);
    assert.equal(totals.rooms, 100);
    assert.equal(totals.inHouse, 9);
    assert.equal(totals.revenueLast30DaysMinor, 14_000_000);
    // (9 + 9) / 100, not the 50% mean of 90% and 10%.
    assert.equal(totals.occupancyTonight, 0.18);
    assert.equal(totals.occupancyRecent, 119 / 700);
  });

  it("has no occupancy when there are no rooms", () => {
    const totals = getPortfolioTotals([empty]);
    assert.equal(totals.occupancyTonight, null);
    assert.equal(formatPercent(totals.occupancyTonight), "—");
  });
});

describe("portfolio formatting", () => {
  it("caps recent occupancy at 100%", () => {
    assert.equal(formatPercent(1.4), "100%");
    assert.equal(formatPercent(0.555), "56%");
  });
});

describe("setup status", () => {
  it("reports live, partial and inactive hotels", () => {
    assert.deepEqual(getSetupStatus(jaipur), { tone: "success", label: "Live" });
    assert.deepEqual(getSetupStatus(empty), { tone: "warning", label: "Setup 0/4" });
    assert.deepEqual(getSetupStatus({ ...jaipur, isActive: false }), { tone: "neutral", label: "Inactive" });
    assert.deepEqual(getMissingSetup(empty), ["rooms", "nightly rates", "address", "cover photo"]);
  });
});
