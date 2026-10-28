import type { HotelOverviewSummaryResponse, HotelRoom, HotelStayListItem } from "@tattvix/contracts";

export type RoomStats = {
  active: number;
  occupied: number;
  vacant: number;
  cleaning: number;
  maintenance: number;
  occupancyPercent: number;
};

export function getRoomStats(rooms: HotelRoom[]): RoomStats {
  const active = rooms.filter((room) => room.isActive);
  const count = (status: HotelRoom["status"]) =>
    active.filter((room) => room.status === status).length;
  const occupied = count("OCCUPIED");
  return {
    active: active.length,
    occupied,
    vacant: count("VACANT"),
    cleaning: count("CLEANING"),
    maintenance: count("MAINTENANCE"),
    occupancyPercent: active.length === 0 ? 0 : Math.round((occupied / active.length) * 100),
  };
}

export function localDayKey(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const dayLabel = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric" });

export type DayMovement = { day: string; label: string; arrivals: number; departures: number };

// Aggregates by the browser's local day. At pilot scale this runs over the
// full stays list; at volume it should become a server-side summary.
export function getDailyMovement(
  stays: HotelStayListItem[],
  today: Date,
  days = 7,
): DayMovement[] {
  const result: DayMovement[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    result.push({ day: localDayKey(date), label: dayLabel.format(date), arrivals: 0, departures: 0 });
  }
  const byDay = new Map(result.map((entry) => [entry.day, entry]));
  for (const stay of stays) {
    if (stay.checkedInAt) {
      const entry = byDay.get(localDayKey(new Date(stay.checkedInAt)));
      if (entry) entry.arrivals += 1;
    }
    if (stay.checkedOutAt) {
      const entry = byDay.get(localDayKey(new Date(stay.checkedOutAt)));
      if (entry) entry.departures += 1;
    }
  }
  return result;
}

export type NeedsAction = { waiting: HotelStayListItem[]; toClean: HotelRoom[] };

const time = (value: string | null) => (value ? new Date(value).getTime() : 0);

export function getNeedsAction(stays: HotelStayListItem[], rooms: HotelRoom[]): NeedsAction {
  return {
    waiting: stays
      .filter((stay) => stay.operationalStatus === "PENDING_CHECK_IN")
      .sort((a, b) => time(a.submittedAt) - time(b.submittedAt)),
    toClean: rooms.filter((room) => room.isActive && room.status === "CLEANING"),
  };
}

export function getInHouse(stays: HotelStayListItem[]): HotelStayListItem[] {
  return stays
    .filter((stay) => stay.operationalStatus === "CHECKED_IN")
    .sort((a, b) => time(b.checkedInAt) - time(a.checkedInAt));
}

export function countArrivalsToday(stays: HotelStayListItem[], today: Date): number {
  const key = localDayKey(today);
  return stays.filter((stay) => stay.checkedInAt && localDayKey(new Date(stay.checkedInAt)) === key).length;
}


export function getLeavingToday(stays: HotelStayListItem[], today: Date): HotelStayListItem[] {
  const key = localDayKey(today);
  return stays.filter((stay) =>
    stay.operationalStatus === "CHECKED_IN" &&
    stay.expectedCheckOutDate !== null && stay.expectedCheckOutDate <= key,
  ).sort((a, b) =>
    a.expectedCheckOutDate!.localeCompare(b.expectedCheckOutDate!) || a.guestName.localeCompare(b.guestName),
  );
}

export function countDeparturesToday(stays: HotelStayListItem[], today: Date): { done: number; due: number } {
  const key = localDayKey(today);
  return {
    done: stays.filter((stay) => stay.checkedOutAt && localDayKey(new Date(stay.checkedOutAt)) === key).length,
    due: getLeavingToday(stays, today).length,
  };
}

export type OccupancyTrend = { date: string; label: string; percent: number };

export function getOccupancyTrend(summary: HotelOverviewSummaryResponse): OccupancyTrend[] {
  return summary.occupancy.map((entry) => ({
    date: entry.date,
    // Parse calendar dates locally; ISO date-only strings otherwise parse as UTC.
    label: dayLabel.format(new Date(`${entry.date}T12:00:00`)),
    percent: summary.activeRooms ? Math.round(entry.occupiedRooms / summary.activeRooms * 100) : 0,
  }));
}

export type ReservationTab = "checkingOut" | "inHouse" | "arriving" | "checkedOut";
export type ReservationGroups = Record<ReservationTab, HotelStayListItem[]>;

/**
 * The Today page's reservation tabs. "Arriving" means guests who submitted
 * check-in on their phone and are waiting for a room; the product has no
 * future reservations, so there is no "upcoming" group.
 */
export function getReservationGroups(stays: HotelStayListItem[], today: Date): ReservationGroups {
  const key = localDayKey(today);
  return {
    checkingOut: getLeavingToday(stays, today),
    inHouse: getInHouse(stays),
    arriving: getNeedsAction(stays, []).waiting,
    checkedOut: stays
      .filter((stay) => stay.checkedOutAt && localDayKey(new Date(stay.checkedOutAt)) === key)
      .sort((a, b) => time(b.checkedOutAt) - time(a.checkedOutAt)),
  };
}

const tabUrgency: ReservationTab[] = ["arriving", "checkingOut", "inHouse", "checkedOut"];

/** Open on the most urgent group that has anyone in it. */
export function getDefaultReservationTab(groups: ReservationGroups): ReservationTab {
  return tabUrgency.find((tab) => groups[tab].length > 0) ?? "arriving";
}

export type StayCardAction = "assignRoom" | "checkOut" | "view";

/** The one action a guest card offers, given what the staff member may do. */
export function getStayCardAction(
  stay: HotelStayListItem,
  todayKey: string,
  permissions: { canAssign: boolean; canCheckout: boolean },
): StayCardAction {
  if (stay.operationalStatus === "PENDING_CHECK_IN" && permissions.canAssign) return "assignRoom";
  if (
    stay.operationalStatus === "CHECKED_IN" &&
    permissions.canCheckout &&
    stay.expectedCheckOutDate !== null &&
    stay.expectedCheckOutDate <= todayKey
  )
    return "checkOut";
  return "view";
}

export type StayStatusTone = "warning" | "danger" | "primary" | "muted";

/** Plain-language status line for a guest card. */
export function getStayStatus(stay: HotelStayListItem, todayKey: string): { label: string; tone: StayStatusTone } {
  if (stay.operationalStatus === "PENDING_CHECK_IN") return { label: "Waiting for a room", tone: "warning" };
  if (stay.operationalStatus === "CHECKED_OUT") return { label: "Checked out", tone: "muted" };
  if (stay.expectedCheckOutDate !== null && stay.expectedCheckOutDate < todayKey)
    return { label: "Overdue checkout", tone: "danger" };
  if (stay.expectedCheckOutDate === todayKey) return { label: "Checking out today", tone: "warning" };
  return { label: "Checked in", tone: "primary" };
}

const roomNumberOrder = new Intl.Collator("en", { numeric: true });

/** Rooms that can take a guest tonight: active, vacant, in room-number order. */
export function getReadyRooms(rooms: HotelRoom[]): HotelRoom[] {
  return rooms
    .filter((room) => room.isActive && room.status === "VACANT")
    .sort((a, b) => roomNumberOrder.compare(a.number, b.number));
}

export type FloorBoardTile = {
  room: HotelRoom;
  kind: "occupied" | "ready" | "cleaning" | "maintenance";
  /** The guest's first name in an occupied room, else the room's state. */
  caption: string;
  /** The checked-in stay in this room, to open from the tile. */
  stayId: string | null;
  leavingToday: boolean;
  overdue: boolean;
};

export type FloorBoardFloor = { label: string; tiles: FloorBoardTile[] };

const tileKind = { VACANT: "ready", OCCUPIED: "occupied", CLEANING: "cleaning", MAINTENANCE: "maintenance" } as const;
const tileCaption = { ready: "Ready", occupied: "Occupied", cleaning: "Cleaning", maintenance: "Maintenance" } as const;

/** Rooms on the floor board: active rooms grouped by floor, each with who is in it and who leaves today. */
export function getFloorBoard(rooms: HotelRoom[], stays: HotelStayListItem[], todayKey: string): FloorBoardFloor[] {
  const byRoom = new Map(stays.filter((stay) => stay.operationalStatus === "CHECKED_IN" && stay.room).map((stay) => [stay.room!.id, stay]));
  const floors = new Map<string, FloorBoardTile[]>();
  for (const room of rooms.filter((entry) => entry.isActive).sort((a, b) => roomNumberOrder.compare(a.number, b.number))) {
    const kind = tileKind[room.status];
    const stay = kind === "occupied" ? byRoom.get(room.id) : undefined;
    const due = stay?.expectedCheckOutDate ?? null;
    const tile: FloorBoardTile = {
      room,
      kind,
      caption: stay ? (stay.guestName.trim().split(/\s+/)[0] ?? tileCaption[kind]) : tileCaption[kind],
      stayId: stay?.id ?? null,
      leavingToday: due === todayKey,
      overdue: due !== null && due < todayKey,
    };
    const floor = room.floor.trim();
    floors.set(floor, [...(floors.get(floor) ?? []), tile]);
  }
  return [...floors.entries()]
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : roomNumberOrder.compare(a, b)))
    .map(([floor, tiles]) => ({ label: floor === "" ? "Other rooms" : /^\d+$/.test(floor) ? `Floor ${floor}` : floor, tiles }));
}
