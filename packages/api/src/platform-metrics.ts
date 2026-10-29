// Portfolio totals, occupancy and setup status for the platform admin views.
// Shared by the web portfolio and the native Platform screen; pure functions.
import type { PlatformPortfolioProperty, PlatformPortfolioRates, PlatformPortfolioRoomCounts, Subscription } from "@tattvix/contracts";

import { formatMoneyWholeRupees } from "./money";

export type PortfolioTotals = {
  properties: number;
  organizations: number;
  rooms: number;
  occupiedRooms: number;
  readyRooms: number;
  inHouse: number;
  arrivalsPending: number;
  checkInsLast7Days: number;
  revenueLast30DaysMinor: number;
  /** Rooms occupied tonight over active rooms, weighted across hotels. */
  occupancyTonight: number | null;
  /** Occupied room-nights over available room-nights, weighted across hotels. */
  occupancyRecent: number | null;
};

function ratio(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

export function getPortfolioTotals(properties: readonly PlatformPortfolioProperty[]): PortfolioTotals {
  let rooms = 0;
  let occupiedRooms = 0;
  let readyRooms = 0;
  let inHouse = 0;
  let arrivalsPending = 0;
  let checkInsLast7Days = 0;
  let revenueLast30DaysMinor = 0;
  let occupiedNights = 0;
  let availableNights = 0;
  const organizations = new Set<string>();

  for (const property of properties) {
    organizations.add(property.organization.slug);
    rooms += property.rooms.total;
    occupiedRooms += property.rooms.occupied;
    readyRooms += property.rooms.ready;
    inHouse += property.stays.inHouse;
    arrivalsPending += property.stays.arrivalsPending;
    checkInsLast7Days += property.stays.checkInsLast7Days;
    revenueLast30DaysMinor += property.revenueLast30DaysMinor;
    occupiedNights += property.occupancy.recentOccupiedRoomNights;
    availableNights += property.occupancy.recentAvailableRoomNights;
  }

  return {
    properties: properties.length,
    organizations: organizations.size,
    rooms,
    occupiedRooms,
    readyRooms,
    inHouse,
    arrivalsPending,
    checkInsLast7Days,
    revenueLast30DaysMinor,
    occupancyTonight: ratio(occupiedRooms, rooms),
    occupancyRecent: ratio(occupiedNights, availableNights),
  };
}

export function getOccupancyTonight(property: PlatformPortfolioProperty): number | null {
  return ratio(property.rooms.occupied, property.rooms.total);
}

export function getOccupancyRecent(property: PlatformPortfolioProperty): number | null {
  return ratio(
    property.occupancy.recentOccupiedRoomNights,
    property.occupancy.recentAvailableRoomNights,
  );
}

/** Recent occupancy can exceed 100% when rooms were deactivated mid-week; cap the display. */
export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(Math.min(value, 1) * 100)}%`;
}

export type SetupStatus =
  | { tone: "neutral"; label: "Inactive" }
  | { tone: "success"; label: "Live" }
  | { tone: "warning"; label: string };

/**
 * Live means the setup checklist is complete (rooms, rates, address, cover).
 * Anything short of that is work an admin may need to chase, so it shows progress.
 */
export function getSetupStatus(property: PlatformPortfolioProperty): SetupStatus {
  if (!property.isActive || !property.organization.isActive) {
    return { tone: "neutral", label: "Inactive" };
  }
  const steps = Object.values(property.setup);
  const done = steps.filter(Boolean).length;
  if (done === steps.length) {
    return { tone: "success", label: "Live" };
  }
  return { tone: "warning", label: `Setup ${done}/${steps.length}` };
}

export function getMissingSetup(property: PlatformPortfolioProperty): string[] {
  const missing: string[] = [];
  if (!property.setup.hasRooms) missing.push("rooms");
  if (!property.setup.hasRates) missing.push("nightly rates");
  if (!property.setup.hasAddress) missing.push("address");
  if (!property.setup.hasCoverPhoto) missing.push("cover photo");
  return missing;
}

// --- Portfolio list: search, sort and display helpers ----------------------


export function formatRateRange(rates: PlatformPortfolioRates): string {
  if (rates.minMinor === null || rates.maxMinor === null) return "No rates";
  if (rates.minMinor === rates.maxMinor) return formatMoneyWholeRupees(rates.minMinor);
  return `${formatMoneyWholeRupees(rates.minMinor)}–${formatMoneyWholeRupees(rates.maxMinor)}`;
}

export const PORTFOLIO_SORTS = [
  { value: "name", label: "Name" },
  { value: "occupancy", label: "Occupancy tonight" },
  { value: "rooms", label: "Most rooms" },
  { value: "revenue", label: "Revenue, 30 days" },
  { value: "activity", label: "Recent activity" },
] as const;

export type PortfolioSort = (typeof PORTFOLIO_SORTS)[number]["value"];

function byName(a: PlatformPortfolioProperty, b: PlatformPortfolioProperty) {
  return (
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) ||
    a.organization.name.localeCompare(b.organization.name, undefined, { sensitivity: "base" }) ||
    a.id - b.id
  );
}

/** Highest first; properties without a value sink to the bottom. */
function descending(a: number | null, b: number | null) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

export function filterAndSortPortfolio(
  properties: readonly PlatformPortfolioProperty[],
  { search, sort }: { search: string; sort: PortfolioSort },
): PlatformPortfolioProperty[] {
  const terms = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matches = properties.filter((property) => {
    if (!terms.length) return true;
    const haystack = [property.name, property.organization.name, property.address, property.slug,
      property.contacts?.phone, ...(property.contacts?.owners.flatMap((owner) => [owner.name, owner.email]) ?? [])]
      .join(" ")
      .toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  });

  const compare: Record<PortfolioSort, (a: PlatformPortfolioProperty, b: PlatformPortfolioProperty) => number> = {
    name: byName,
    occupancy: (a, b) => descending(getOccupancyTonight(a), getOccupancyTonight(b)) || byName(a, b),
    rooms: (a, b) => b.rooms.total - a.rooms.total || byName(a, b),
    revenue: (a, b) => b.revenueLast30DaysMinor - a.revenueLast30DaysMinor || byName(a, b),
    activity: (a, b) =>
      descending(
        a.lastActivityAt ? Date.parse(a.lastActivityAt) : null,
        b.lastActivityAt ? Date.parse(b.lastActivityAt) : null,
      ) || byName(a, b),
  };
  return [...matches].sort(compare[sort]);
}

// Hand-rolled: Hermes (the native app's engine) has no Intl.RelativeTimeFormat,
// and constructing one at import time would break every screen.
function relative(value: number, unit: "minute" | "hour" | "day") {
  if (unit === "day" && value === -1) return "yesterday";
  if (unit === "day" && value === 1) return "tomorrow";
  const count = Math.abs(value);
  const label = `${count} ${unit}${count === 1 ? "" : "s"}`;
  return value < 0 ? `${label} ago` : `in ${label}`;
}

export function formatLastActivity(value: string | null, now: Date = new Date()): string {
  if (!value) return "No activity yet";
  const minutes = Math.round((Date.parse(value) - now.getTime()) / 60_000);
  if (Math.abs(minutes) < 60) return minutes > -1 ? "Just now" : relative(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return relative(days, "day");
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function roomTypeLabel(name: string): string {
  return name || "No room type";
}

const roomStatusSegments = [
  { key: "occupied", label: "occupied" },
  { key: "ready", label: "ready" },
  { key: "cleaning", label: "cleaning" },
  { key: "maintenance", label: "maintenance" },
] as const;

/** "9 occupied · 1 ready" for the room mix tonight; "No rooms yet" without rooms. */
export function roomStatusSummary(rooms: PlatformPortfolioRoomCounts) {
  if (!rooms.total) return "No rooms yet";
  return roomStatusSegments
    .filter((segment) => rooms[segment.key] > 0)
    .map((segment) => `${rooms[segment.key]} ${segment.label}`)
    .join(" · ");
}

export type SubscriptionPillTone = "neutral" | "success" | "warning" | "danger";
export type SubscriptionPill = { tone: SubscriptionPillTone; label: string };

/** The short entitlement pill shown beside a hotel: trial with days left, paid, ended or missing. */
export function getSubscriptionPill(subscription: Subscription): SubscriptionPill {
  switch (subscription.status) {
    case "PAID":
      return { tone: "success", label: "Paid" };
    case "TRIALING":
      return { tone: subscription.daysLeft <= 14 ? "warning" : "neutral", label: `Trial · ${subscription.daysLeft}d` };
    case "EXPIRED":
      return { tone: "danger", label: "Trial ended" };
    default:
      return { tone: "danger", label: "No subscription" };
  }
}

/** The subscription section's own pill: the same tones, but worded as a status. */
export function getSubscriptionStatusPill(subscription: Subscription): SubscriptionPill {
  switch (subscription.status) {
    case "PAID":
      return { tone: "success", label: "Paid" };
    case "TRIALING":
      return { tone: subscription.daysLeft <= 14 ? "warning" : "neutral", label: "Free trial" };
    case "EXPIRED":
      return { tone: "danger", label: "Trial ended" };
    default:
      return { tone: "danger", label: "No subscription" };
  }
}

// --- Needs attention -------------------------------------------------------
// Two admin to-do lists derived from the portfolio payload: who to chase for
// payment, and who has quietly stopped using the product. Thresholds are a
// week because trials are chased weekly and a hotel with zero check-ins in a
// week is either closed or has gone back to the paper register.

export const BILLING_SOON_DAYS = 7;
export const STALE_AFTER_DAYS = 7;

export type BillingAttention = {
  organization: PlatformPortfolioProperty["organization"];
  propertyCount: number;
  /** `lapsed` covers both an ended trial and a missing subscription row. */
  kind: "lapsed" | "ending";
};

export type PortfolioAttention = {
  /** One row per organization, most urgent first. */
  billing: BillingAttention[];
  /** Entitled, active properties onboarded over a week ago with no check-in in the last 7 days. */
  stale: PlatformPortfolioProperty[];
};

export function getPortfolioAttention(
  properties: readonly PlatformPortfolioProperty[],
  now: Date = new Date(),
): PortfolioAttention {
  const byOrganization = new Map<string, BillingAttention>();
  for (const property of properties) {
    const { organization } = property;
    if (!organization.isActive) continue;
    const existing = byOrganization.get(organization.slug);
    if (existing) {
      existing.propertyCount += 1;
      continue;
    }
    const { subscription } = organization;
    const kind = !subscription.entitled
      ? "lapsed"
      : subscription.daysLeft <= BILLING_SOON_DAYS
        ? "ending"
        : null;
    if (kind) byOrganization.set(organization.slug, { organization, propertyCount: 1, kind });
  }
  const billing = [...byOrganization.values()].sort(
    (a, b) =>
      Number(a.kind === "ending") - Number(b.kind === "ending") ||
      a.organization.subscription.daysLeft - b.organization.subscription.daysLeft ||
      a.organization.name.localeCompare(b.organization.name, undefined, { sensitivity: "base" }),
  );

  const staleCutoff = now.getTime() - STALE_AFTER_DAYS * 86_400_000;
  const stale = properties
    .filter(
      (property) =>
        property.isActive &&
        property.organization.isActive &&
        property.organization.subscription.entitled &&
        Date.parse(property.onboarding.onboardedAt) <= staleCutoff &&
        property.stays.checkInsLast7Days === 0,
    )
    .sort(
      (a, b) =>
        (a.lastActivityAt ? Date.parse(a.lastActivityAt) : -Infinity) -
          (b.lastActivityAt ? Date.parse(b.lastActivityAt) : -Infinity) || byName(a, b),
    );

  return { billing, stale };
}

/** The one line under a billing row: how many properties, and when the entitlement ended or ends. */
export function billingAttentionMeta(row: BillingAttention, formatDate: (iso: string) => string): string {
  const { subscription } = row.organization;
  const properties = `${row.propertyCount} ${row.propertyCount === 1 ? "property" : "properties"}`;
  const when = subscription.entitledUntil ? formatDate(subscription.entitledUntil) : null;
  if (row.kind === "lapsed") {
    return when ? `${properties} · ended ${when} · check-ins paused` : `${properties} · never had a trial · check-ins paused`;
  }
  return `${properties} · ${subscription.status === "PAID" ? "paid until" : "trial ends"} ${when ?? "soon"}`;
}
