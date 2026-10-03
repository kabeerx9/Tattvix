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
