import { getOccupancyTonight } from "@tattvix/api";
import type {
  PlatformPortfolioProperty,
  PlatformPortfolioRates,
} from "@tattvix/contracts";

import { formatMoneyWholeRupees } from "@/lib/money";

export {
  formatPercent,
  getMissingSetup,
  getOccupancyRecent,
  getOccupancyTonight,
  getPortfolioTotals,
  getSetupStatus,
  type PortfolioTotals,
  type SetupStatus,
} from "@tattvix/api";

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
    const haystack = [property.name, property.organization.name, property.address, property.slug]
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

const relative = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });

export function formatLastActivity(value: string | null, now: Date = new Date()): string {
  if (!value) return "No activity yet";
  const minutes = Math.round((Date.parse(value) - now.getTime()) / 60_000);
  if (Math.abs(minutes) < 60) return minutes > -1 ? "Just now" : relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return relative.format(days, "day");
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function roomTypeLabel(name: string): string {
  return name || "No room type";
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
