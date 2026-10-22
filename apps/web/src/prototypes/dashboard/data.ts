// Mock data for the dashboard prototypes. Every record is typed against the
// real API contracts, so a variant can only show fields the product has.
// Photos are royalty-free Unsplash stock standing in for the property's own
// uploads (cover + one per room type), which is what the real API returns.
import type {
  HotelOverviewSummaryResponse,
  HotelRoom,
  HotelStayListItem,
  PropertyPhotosResponse,
} from "@tattvix/contracts";

import { localDayKey } from "@/features/hotel-overview/metrics";

const unsplash = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&q=75&auto=format&fit=crop`;

export const property = {
  name: "The Aravali Haveli",
  city: "Udaipur, Rajasthan",
  organization: "Aravali Hospitality",
  staffName: "Kabeer",
};

export const photos: PropertyPhotosResponse = {
  cover: { url: unsplash("1564501049412-61c2a3083791", 1600, 900) },
  roomTypes: [
    { roomType: "Garden Room", url: unsplash("1611892440504-42a792e24d32") },
    { roomType: "Superior Twin", url: unsplash("1595576508898-0ad5c879a061") },
    { roomType: "Deluxe King", url: unsplash("1618773928121-c32242e63f39") },
    { roomType: "Family Room", url: unsplash("1566665797739-1674de7a421a") },
    { roomType: "Heritage Suite", url: unsplash("1590490360182-c33d57733427") },
  ],
};

export function roomTypePhoto(roomType: string | undefined) {
  return photos.roomTypes.find((photo) => photo.roomType === roomType)?.url;
}

const rates: Record<string, number> = {
  "Garden Room": 550_000,
  "Superior Twin": 620_000,
  "Deluxe King": 780_000,
  "Family Room": 950_000,
  "Heritage Suite": 1_450_000,
};

const roomPlan: [string, string, string][] = [
  ["101", "Ground", "Garden Room"],
  ["102", "Ground", "Garden Room"],
  ["103", "Ground", "Garden Room"],
  ["104", "Ground", "Superior Twin"],
  ["105", "Ground", "Superior Twin"],
  ["106", "Ground", "Family Room"],
  ["107", "Ground", "Family Room"],
  ["108", "Ground", "Garden Room"],
  ["201", "First", "Deluxe King"],
  ["202", "First", "Deluxe King"],
  ["203", "First", "Deluxe King"],
  ["204", "First", "Superior Twin"],
  ["205", "First", "Superior Twin"],
  ["206", "First", "Deluxe King"],
  ["207", "First", "Family Room"],
  ["208", "First", "Deluxe King"],
  ["301", "Second", "Heritage Suite"],
  ["302", "Second", "Heritage Suite"],
  ["303", "Second", "Deluxe King"],
  ["304", "Second", "Deluxe King"],
  ["305", "Second", "Heritage Suite"],
  ["306", "Second", "Deluxe King"],
  ["307", "Second", "Superior Twin"],
  ["308", "Second", "Garden Room"],
];

// Rooms that are not occupied by a stay below get these explicit statuses.
const nonOccupiedStatus: Record<string, HotelRoom["status"]> = {
  "103": "CLEANING",
  "205": "CLEANING",
  "304": "MAINTENANCE",
};

type StaySeed = {
  name: string;
  companions: number;
  state: "waiting" | "in" | "out";
  room?: string;
  /** Hours ago the guest submitted (waiting) or checked in (in/out). */
  hoursAgo: number;
  /** Day offset of expected checkout relative to today. */
  dueOffset?: number;
  /** Hours ago the guest checked out (state "out"). */
  outHoursAgo?: number;
};

const staySeeds: StaySeed[] = [
  { name: "Ananya Iyer", companions: 1, state: "waiting", hoursAgo: 0.4 },
  { name: "Farhan Qureshi", companions: 3, state: "waiting", hoursAgo: 0.9 },
  { name: "Meenakshi Pillai", companions: 1, state: "waiting", hoursAgo: 1.6 },
  { name: "Rohan Mehta", companions: 0, state: "waiting", hoursAgo: 2.2 },

  { name: "Vikram Singh Rathore", companions: 1, state: "in", room: "301", hoursAgo: 75, dueOffset: -1 },
  { name: "Priya Nair", companions: 1, state: "in", room: "201", hoursAgo: 50, dueOffset: 0 },
  { name: "Arjun Kapoor", companions: 0, state: "in", room: "104", hoursAgo: 26, dueOffset: 0 },
  { name: "Sneha Kulkarni", companions: 2, state: "in", room: "106", hoursAgo: 49, dueOffset: 0 },
  { name: "Kavya Reddy", companions: 1, state: "in", room: "202", hoursAgo: 3, dueOffset: 2 },
  { name: "Siddharth Menon", companions: 0, state: "in", room: "101", hoursAgo: 5, dueOffset: 1 },
  { name: "Ishaan Chatterjee", companions: 1, state: "in", room: "302", hoursAgo: 28, dueOffset: 3 },
  { name: "Neha Agarwal", companions: 2, state: "in", room: "207", hoursAgo: 22, dueOffset: 2 },
  { name: "Rahul Deshpande", companions: 0, state: "in", room: "203", hoursAgo: 46, dueOffset: 1 },
  { name: "Aditi Bhattacharya", companions: 1, state: "in", room: "305", hoursAgo: 70, dueOffset: 2 },
  { name: "Karan Malhotra", companions: 1, state: "in", room: "206", hoursAgo: 27, dueOffset: 4 },
  { name: "Pooja Venkatesh", companions: 3, state: "in", room: "107", hoursAgo: 52, dueOffset: 1 },
  { name: "Zoya Khan", companions: 0, state: "in", room: "102", hoursAgo: 4, dueOffset: 3 },
  { name: "Devendra Joshi", companions: 1, state: "in", room: "303", hoursAgo: 96, dueOffset: 1 },

  { name: "Manish Gupta", companions: 1, state: "out", room: "205", hoursAgo: 70, outHoursAgo: 2 },
  { name: "Lakshmi Subramanian", companions: 0, state: "out", room: "103", hoursAgo: 49, outHoursAgo: 3.5 },
  { name: "Harsh Vardhan", companions: 2, state: "out", room: "204", hoursAgo: 98, outHoursAgo: 26 },
  { name: "Tanvi Shah", companions: 1, state: "out", room: "208", hoursAgo: 120, outHoursAgo: 50 },
];

function hoursAgoIso(now: Date, hours: number) {
  return new Date(now.getTime() - hours * 3_600_000).toISOString();
}

export function dayOffsetKey(now: Date, offset: number) {
  return localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
}

export type MockHotel = {
  rooms: HotelRoom[];
  stays: HotelStayListItem[];
};

export function createMockHotel(now = new Date()): MockHotel {
  const occupiedBy = new Map(
    staySeeds.filter((seed) => seed.state === "in").map((seed) => [seed.room!, seed]),
  );
  const rooms: HotelRoom[] = roomPlan.map(([number, floor, roomType], index) => ({
    id: index + 1,
    number,
    floor,
    roomType,
    status: occupiedBy.has(number) ? "OCCUPIED" : (nonOccupiedStatus[number] ?? "VACANT"),
    // Room 308 is under renovation and switched off.
    isActive: number !== "308",
    nightlyRateMinor: rates[roomType] ?? null,
  }));
  const roomByNumber = new Map(rooms.map((room) => [room.number, room]));

  const stays: HotelStayListItem[] = staySeeds.map((seed, index) => {
    const room = seed.room ? roomByNumber.get(seed.room) : undefined;
    const base = {
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      guestName: seed.name,
      companionCount: seed.companions,
      closedAt: null,
      hotelAccessExpiresAt: hoursAgoIso(now, -72),
      identityAccess: {
        isActive: seed.state !== "out",
        reason: seed.state === "out" ? ("EXPIRED" as const) : ("ACTIVE" as const),
        expiresAt: hoursAgoIso(now, -72),
      },
    };
    if (seed.state === "waiting") {
      return {
        ...base,
        status: "SUBMITTED",
        operationalStatus: "PENDING_CHECK_IN",
        room: null,
        submittedAt: hoursAgoIso(now, seed.hoursAgo),
        checkedInAt: null,
        checkedOutAt: null,
        expectedCheckOutDate: null,
      };
    }
    return {
      ...base,
      status: seed.state === "out" ? "CLOSED" : "SUBMITTED",
      operationalStatus: seed.state === "out" ? "CHECKED_OUT" : "CHECKED_IN",
      room: room ? { id: room.id, number: room.number } : null,
      submittedAt: hoursAgoIso(now, seed.hoursAgo + 0.3),
      checkedInAt: hoursAgoIso(now, seed.hoursAgo),
      checkedOutAt: seed.state === "out" ? hoursAgoIso(now, seed.outHoursAgo!) : null,
      expectedCheckOutDate:
        seed.state === "out"
          ? localDayKey(new Date(now.getTime() - seed.outHoursAgo! * 3_600_000))
          : dayOffsetKey(now, seed.dueOffset ?? 1),
    };
  });

  return { rooms, stays };
}

// Deterministic occupancy/revenue history for the summary endpoint's
// `?days=` window (7, 14 or 30 in the prototypes).
export function createSummary(days: number, activeRooms: number, occupiedToday: number, now = new Date()): HotelOverviewSummaryResponse {
  const occupancy: HotelOverviewSummaryResponse["occupancy"] = [];
  const byDay: { date: string; amountMinor: number }[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = dayOffsetKey(now, -offset);
    const weekday = new Date(`${date}T12:00:00`).getDay();
    const weekend = weekday === 5 || weekday === 6 ? 3 : 0;
    const wave = Math.round(Math.sin(offset * 1.3) * 2 + Math.cos(offset * 0.7) * 2);
    const occupied = offset === 0 ? occupiedToday : Math.max(8, Math.min(activeRooms, 14 + weekend + wave));
    occupancy.push({ date, occupiedRooms: occupied });
    byDay.push({ date, amountMinor: occupied * 812_500 + ((offset * 37) % 9) * 150_000 });
  }
  return {
    dateFrom: occupancy[0]!.date,
    dateTo: occupancy.at(-1)!.date,
    activeRooms,
    occupancy,
    revenue: { totalMinor: byDay.reduce((sum, day) => sum + day.amountMinor, 0), byDay },
  };
}
