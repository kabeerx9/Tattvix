import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlatformPortfolioProperty, Subscription } from "@tattvix/contracts";

import {
  filterAndSortPortfolio,
  formatLastActivity,
  formatRateRange,
  getPortfolioAttention,
} from "./metrics";

const TRIAL = {
  status: "TRIALING",
  entitled: true,
  trialEndsAt: "2026-12-08T00:00:00Z",
  paidUntil: null,
  entitledUntil: "2026-12-08T00:00:00Z",
  daysLeft: 45,
} as const;

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
  lastActivityAt: "2026-10-22T08:00:00+00:00",
});
const goa = property({
  id: 2,
  name: "Goa",
  organization: { name: "Other Stays", slug: "other-stays", isActive: true, activeMemberCount: 3, subscription: TRIAL },
  rooms: { total: 90, occupied: 9, ready: 70, cleaning: 10, maintenance: 1 },
  occupancy: { recentNights: 7, recentOccupiedRoomNights: 63, recentAvailableRoomNights: 630 },
  revenueLast30DaysMinor: 9_000_000,
  lastActivityAt: "2026-10-20T08:00:00+00:00",
});
const empty = property({ id: 3, name: "Agra", setup: { hasAddress: false, hasCoverPhoto: false, hasRooms: false, hasRates: false } });

describe("portfolio search and sort", () => {
  const all = [jaipur, goa, empty];

  it("matches every term across name, organization and address", () => {
    assert.deepEqual(filterAndSortPortfolio(all, { search: "mi road", sort: "name" }).map((p) => p.id), [1]);
    assert.deepEqual(filterAndSortPortfolio(all, { search: "other", sort: "name" }).map((p) => p.id), [2]);
    assert.deepEqual(filterAndSortPortfolio(all, { search: "jaipur other", sort: "name" }), []);
  });

  it("sorts by name, occupancy, rooms, revenue and activity", () => {
    const ids = (sort: Parameters<typeof filterAndSortPortfolio>[1]["sort"]) =>
      filterAndSortPortfolio(all, { search: "", sort }).map((p) => p.id);
    assert.deepEqual(ids("name"), [3, 2, 1]);
    assert.deepEqual(ids("occupancy"), [1, 2, 3]);
    assert.deepEqual(ids("rooms"), [2, 1, 3]);
    assert.deepEqual(ids("revenue"), [2, 1, 3]);
    assert.deepEqual(ids("activity"), [1, 2, 3]);
  });
});

describe("portfolio formatting", () => {
  it("formats rate ranges in whole rupees", () => {
    assert.equal(formatRateRange({ minMinor: null, avgMinor: null, maxMinor: null }), "No rates");
    assert.equal(formatRateRange({ minMinor: 400_000, avgMinor: 400_000, maxMinor: 400_000 }), "₹4,000");
    assert.equal(formatRateRange({ minMinor: 400_000, avgMinor: 733_333, maxMinor: 1_200_000 }), "₹4,000–₹12,000");
  });

  it("formats last activity relative to now", () => {
    const now = new Date("2026-10-22T10:00:00+00:00");
    assert.equal(formatLastActivity(null, now), "No activity yet");
    assert.equal(formatLastActivity("2026-10-22T09:59:30+00:00", now), "Just now");
    assert.equal(formatLastActivity("2026-10-22T08:00:00+00:00", now), "2 hours ago");
    assert.equal(formatLastActivity("2026-10-20T10:00:00+00:00", now), "2 days ago");
  });
});

describe("portfolio attention", () => {
  const now = new Date("2026-10-25T10:00:00+00:00");
  const sub = (overrides: Partial<Subscription>): Subscription => ({ ...TRIAL, ...overrides });
  const org = (slug: string, subscription: Subscription, isActive = true) => ({
    name: slug, slug, isActive, activeMemberCount: 1, subscription,
  });

  it("lists lapsed organizations before ones about to end, once per organization", () => {
    const ending = org("ending", sub({ daysLeft: 6 }));
    const rows = [
      property({ id: 1, name: "A", organization: org("fine", TRIAL) }),
      property({ id: 2, name: "B", organization: ending }),
      property({ id: 3, name: "C", organization: ending }),
      property({ id: 4, name: "D", organization: org("ended", sub({ status: "EXPIRED", entitled: false, daysLeft: 0 })) }),
      property({ id: 5, name: "E", organization: org("missing", sub({ status: "MISSING", entitled: false, daysLeft: 0, trialEndsAt: null, entitledUntil: null })) }),
      property({ id: 6, name: "F", organization: org("paid-ending", sub({ status: "PAID", daysLeft: 2 })) }),
      property({ id: 7, name: "G", organization: org("inactive", sub({ status: "EXPIRED", entitled: false, daysLeft: 0 }), false) }),
    ];
    const { billing } = getPortfolioAttention(rows, now);
    assert.deepEqual(
      billing.map((row) => [row.organization.slug, row.kind, row.propertyCount]),
      [["ended", "lapsed", 1], ["missing", "lapsed", 1], ["paid-ending", "ending", 1], ["ending", "ending", 2]],
    );
  });

  it("flags entitled hotels onboarded over a week ago with no check-ins, quietest first", () => {
    const rows = [
      property({ id: 1, name: "New", onboarding: { source: "ADMIN", onboardedAt: "2026-10-20T00:00:00+00:00" } }),
      property({ id: 2, name: "Busy", stays: { inHouse: 1, arrivalsPending: 0, checkInsLast7Days: 3 } }),
      property({ id: 3, name: "Quiet", lastActivityAt: "2026-10-10T00:00:00+00:00" }),
      property({ id: 4, name: "Silent", lastActivityAt: null }),
      property({ id: 5, name: "Closed", isActive: false }),
      property({ id: 6, name: "Lapsed", organization: org("lapsed", sub({ status: "EXPIRED", entitled: false, daysLeft: 0 })) }),
    ];
    const { stale } = getPortfolioAttention(rows, now);
    assert.deepEqual(stale.map((row) => row.name), ["Silent", "Quiet"]);
  });

  it("is empty for a healthy portfolio", () => {
    assert.deepEqual(getPortfolioAttention([jaipur], now), { billing: [], stale: [] });
  });
});

it("searches owner names, emails and property contact numbers", () => {
  const hotel = property({ id: 99, name: "Contact hotel", contacts: { phone: "+919876543210", owners: [{ name: "Shubham Tiwari", email: "shubham@example.com" }] } });
  for (const search of ["tiwari", "SHUBHAM@EXAMPLE.COM", "9876543210"]) {
    assert.deepEqual(filterAndSortPortfolio([hotel], { search, sort: "name" }).map((p) => p.id), [99]);
  }
  assert.deepEqual(filterAndSortPortfolio([hotel], { search: "unknown@example.com", sort: "name" }), []);
});
