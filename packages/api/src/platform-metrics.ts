// Portfolio totals, occupancy and setup status for the platform admin views.
// Shared by the web portfolio and the native Platform screen; pure functions.
import type { PlatformPortfolioProperty } from "@tattvix/contracts";

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
