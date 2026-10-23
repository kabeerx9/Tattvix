// Mock data for the shell + palette prototypes, shaped like the real
// contracts (PlatformPortfolioProperty, HotelStayListItem, HotelRoom) so the
// production metrics helpers run on it unchanged. Fake data only.
import type { HotelRoom, HotelStayListItem, PlatformPortfolioProperty } from "@tattvix/contracts";

const photo = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=70&auto=format&fit=crop`;

export const photos = {
  haveli: photo("1477587458883-47145ed94245"),
  goa: photo("1512343879784-a960bf40e7f2"),
  udaipur: photo("1566073771259-6a8506099945"),
  kerala: photo("1602216056096-3b40cc0c9944"),
  shimla: photo("1542314831-068cd1dbfeeb"),
  mumbai: photo("1551882547-ff40c63fe5fa"),
  pool: photo("1571896349842-33c89424de2d"),
  lobby: photo("1445019980597-93fa8acb246c"),
  deluxe: photo("1582719478250-c89cae4dc85b", 600),
  suite: photo("1590490360182-c33d57733427", 600),
  twin: photo("1611892440504-42a792e24d32", 600),
  heritage: photo("1618773928121-c32242e63f39", 600),
  premium: photo("1631049307264-da0ec9d70304", 600),
  family: photo("1564501049412-61c2a3083791", 600),
  villa: photo("1584132967334-10e028bd69f7", 600),
  standard: photo("1578683010236-d716f9a3f461", 600),
} as const;

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
const rupees = (value: number) => value * 100;

type RoomTypeSeed = { name: string; total: number; occupied: number; ready: number; cleaning: number; maintenance?: number; min: number; max: number; photoUrl: string | null };

function property(seed: {
  id: number;
  name: string;
  slug: string;
  address: string;
  cover: string | null;
  org: { name: string; slug: string; members: number };
  roomTypes: RoomTypeSeed[];
  inHouse: number;
  arrivals: number;
  checkIns7: number;
  revenue30: number;
  recentRate: number;
  activityHours: number | null;
  isActive?: boolean;
  setup?: Partial<PlatformPortfolioProperty["setup"]>;
}): PlatformPortfolioProperty {
  const roomTypes = seed.roomTypes.map((type) => ({
    name: type.name,
    photoUrl: type.photoUrl,
    rooms: {
      total: type.total,
      occupied: type.occupied,
      ready: type.ready,
      cleaning: type.cleaning,
      maintenance: type.maintenance ?? 0,
    },
    rates: { minMinor: rupees(type.min), avgMinor: rupees(Math.round((type.min + type.max) / 2)), maxMinor: rupees(type.max) },
  }));
  const sum = (key: keyof (typeof roomTypes)[number]["rooms"]) => roomTypes.reduce((total, type) => total + type.rooms[key], 0);
  const mins = seed.roomTypes.map((type) => type.min);
  const maxes = seed.roomTypes.map((type) => type.max);
  const total = sum("total");
  return {
    id: seed.id,
    name: seed.name,
    slug: seed.slug,
    isActive: seed.isActive ?? true,
    address: seed.address,
    coverPhotoUrl: seed.cover,
    organization: { name: seed.org.name, slug: seed.org.slug, isActive: true, activeMemberCount: seed.org.members },
    onboarding: { source: "REQUEST", onboardedAt: hoursAgo(24 * 60) },
    setup: {
      hasAddress: true,
      hasCoverPhoto: seed.cover !== null,
      hasRooms: total > 0,
      hasRates: mins.length > 0,
      ...seed.setup,
    },
    rooms: { total, occupied: sum("occupied"), ready: sum("ready"), cleaning: sum("cleaning"), maintenance: sum("maintenance") },
    rates: mins.length
      ? {
          minMinor: rupees(Math.min(...mins)),
          avgMinor: rupees(Math.round(mins.concat(maxes).reduce((a, b) => a + b, 0) / (mins.length * 2))),
          maxMinor: rupees(Math.max(...maxes)),
        }
      : { minMinor: null, avgMinor: null, maxMinor: null },
    roomTypes,
    occupancy: {
      recentNights: 7,
      recentOccupiedRoomNights: Math.round(total * 7 * seed.recentRate),
      recentAvailableRoomNights: total * 7,
    },
    stays: { inHouse: seed.inHouse, arrivalsPending: seed.arrivals, checkInsLast7Days: seed.checkIns7 },
    revenueLast30DaysMinor: rupees(seed.revenue30),
    lastActivityAt: seed.activityHours === null ? null : hoursAgo(seed.activityHours),
  };
}

const rajwada = { name: "Rajwada Hospitality", slug: "rajwada", members: 9 };
const himalayan = { name: "Himalayan Inns", slug: "himalayan-inns", members: 5 };

export const portfolio: PlatformPortfolioProperty[] = [
  property({
    id: 1,
    name: "Umaid Niwas Haveli",
    slug: "umaid-niwas",
    address: "Bani Park, Jaipur, Rajasthan",
    cover: photos.haveli,
    org: rajwada,
    roomTypes: [
      { name: "Heritage Deluxe", total: 12, occupied: 9, ready: 2, cleaning: 1, min: 4800, max: 6200, photoUrl: photos.heritage },
      { name: "Maharaja Suite", total: 4, occupied: 3, ready: 1, cleaning: 0, min: 11500, max: 14000, photoUrl: photos.suite },
      { name: "Courtyard Twin", total: 8, occupied: 5, ready: 1, cleaning: 1, maintenance: 1, min: 3600, max: 4200, photoUrl: photos.twin },
    ],
    inHouse: 31,
    arrivals: 3,
    checkIns7: 46,
    revenue30: 1842600,
    recentRate: 0.74,
    activityHours: 0.3,
  }),
  property({
    id: 2,
    name: "Lakeview Residency",
    slug: "lakeview-udaipur",
    address: "Lal Ghat, Udaipur, Rajasthan",
    cover: photos.udaipur,
    org: rajwada,
    roomTypes: [
      { name: "Lake Facing Deluxe", total: 16, occupied: 14, ready: 1, cleaning: 1, min: 6400, max: 8200, photoUrl: photos.premium },
      { name: "Premium King", total: 10, occupied: 7, ready: 2, cleaning: 1, min: 5200, max: 6000, photoUrl: photos.deluxe },
      { name: "Family Room", total: 6, occupied: 4, ready: 1, cleaning: 0, maintenance: 1, min: 7400, max: 8800, photoUrl: photos.family },
    ],
    inHouse: 58,
    arrivals: 2,
    checkIns7: 71,
    revenue30: 3126400,
    recentRate: 0.81,
    activityHours: 1.5,
  }),
  property({
    id: 3,
    name: "Sea Breeze Candolim",
    slug: "sea-breeze-candolim",
    address: "Candolim Beach Road, North Goa",
    cover: photos.goa,
    org: { name: "Konkan Coast Stays", slug: "konkan-coast", members: 4 },
    roomTypes: [
      { name: "Garden Deluxe", total: 10, occupied: 6, ready: 3, cleaning: 1, min: 3900, max: 5400, photoUrl: photos.standard },
      { name: "Pool Villa", total: 4, occupied: 4, ready: 0, cleaning: 0, min: 12800, max: 16500, photoUrl: photos.villa },
      { name: "Sea View Suite", total: 4, occupied: 2, ready: 1, cleaning: 1, min: 9200, max: 11000, photoUrl: photos.suite },
    ],
    inHouse: 27,
    arrivals: 4,
    checkIns7: 38,
    revenue30: 1574200,
    recentRate: 0.66,
    activityHours: 3,
  }),
  property({
    id: 4,
    name: "Kumarakom Backwater Retreat",
    slug: "kumarakom-retreat",
    address: "Vembanad Lake, Kumarakom, Kerala",
    cover: photos.kerala,
    org: { name: "Malabar Retreats", slug: "malabar", members: 6 },
    roomTypes: [
      { name: "Lake Cottage", total: 8, occupied: 5, ready: 2, cleaning: 1, min: 8600, max: 10400, photoUrl: photos.villa },
      { name: "Heritage Villa", total: 6, occupied: 4, ready: 1, cleaning: 0, maintenance: 1, min: 14200, max: 18600, photoUrl: photos.heritage },
    ],
    inHouse: 19,
    arrivals: 1,
    checkIns7: 22,
    revenue30: 2238900,
    recentRate: 0.69,
    activityHours: 6,
  }),
  property({
    id: 5,
    name: "The Ridge, Mall Road",
    slug: "the-ridge-shimla",
    address: "Mall Road, Shimla, Himachal Pradesh",
    cover: photos.shimla,
    org: himalayan,
    roomTypes: [
      { name: "Valley View Deluxe", total: 12, occupied: 6, ready: 4, cleaning: 2, min: 4200, max: 5600, photoUrl: photos.deluxe },
      { name: "Standard Double", total: 8, occupied: 3, ready: 4, cleaning: 1, min: 2800, max: 3300, photoUrl: photos.standard },
    ],
    inHouse: 17,
    arrivals: 0,
    checkIns7: 24,
    revenue30: 812300,
    recentRate: 0.52,
    activityHours: 20,
  }),
  property({
    id: 6,
    name: "Ganga Ghat Inn",
    slug: "ganga-ghat-inn",
    address: "Tapovan, Rishikesh, Uttarakhand",
    cover: null,
    org: himalayan,
    roomTypes: [
      { name: "River View Double", total: 8, occupied: 3, ready: 3, cleaning: 2, min: 2400, max: 3200, photoUrl: null },
      { name: "Dorm Bed", total: 4, occupied: 2, ready: 2, cleaning: 0, min: 900, max: 900, photoUrl: null },
    ],
    inHouse: 9,
    arrivals: 1,
    checkIns7: 15,
    revenue30: 286400,
    recentRate: 0.48,
    activityHours: 30,
  }),
  property({
    id: 7,
    name: "Bandra Bay Suites",
    slug: "bandra-bay",
    address: "Carter Road, Bandra West, Mumbai",
    cover: photos.mumbai,
    org: { name: "Seaface Hotels", slug: "seaface", members: 12 },
    roomTypes: [
      { name: "Executive King", total: 22, occupied: 19, ready: 1, cleaning: 2, min: 8900, max: 11200, photoUrl: photos.premium },
      { name: "Studio Suite", total: 12, occupied: 10, ready: 1, cleaning: 1, min: 12400, max: 15800, photoUrl: photos.suite },
      { name: "Twin Business", total: 6, occupied: 4, ready: 1, cleaning: 0, maintenance: 1, min: 7600, max: 8400, photoUrl: photos.twin },
    ],
    inHouse: 49,
    arrivals: 5,
    checkIns7: 88,
    revenue30: 5284100,
    recentRate: 0.87,
    activityHours: 0.1,
  }),
  property({
    id: 8,
    name: "Mysuru Palace View",
    slug: "mysuru-palace-view",
    address: "",
    cover: null,
    org: { name: "Deccan Heritage", slug: "deccan-heritage", members: 2 },
    roomTypes: [],
    inHouse: 0,
    arrivals: 0,
    checkIns7: 0,
    revenue30: 0,
    recentRate: 0,
    activityHours: null,
    setup: { hasAddress: false },
  }),
];

/** Portfolio occupancy, last 7 nights (percent), for the chart palette. */
export const portfolioTrend = [
  { label: "Fri", percent: 64, lastWeek: 58 },
  { label: "Sat", percent: 78, lastWeek: 71 },
  { label: "Sun", percent: 72, lastWeek: 69 },
  { label: "Mon", percent: 61, lastWeek: 60 },
  { label: "Tue", percent: 66, lastWeek: 57 },
  { label: "Wed", percent: 70, lastWeek: 63 },
  { label: "Thu", percent: 74, lastWeek: 66 },
];

// ---- Hotel Today (Umaid Niwas Haveli, Jaipur) ----

export const todayProperty = { name: "Umaid Niwas Haveli", city: "Jaipur", cover: photos.haveli };

function dayKey(offsetDays: number) {
  const date = new Date(now + offsetDays * 86_400_000);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

let stayCounter = 0;
function stay(seed: {
  guestName: string;
  companions: number;
  status: HotelStayListItem["operationalStatus"];
  room?: { id: number; number: string };
  submittedHoursAgo?: number;
  checkedInHoursAgo?: number;
  checkedOutHoursAgo?: number;
  dueOutDays?: number;
}): HotelStayListItem {
  stayCounter += 1;
  return {
    id: `00000000-0000-4000-8000-${String(stayCounter).padStart(12, "0")}`,
    status: seed.status === "CHECKED_OUT" ? "CLOSED" : "SUBMITTED",
    operationalStatus: seed.status,
    room: seed.room ?? null,
    submittedAt: hoursAgo(seed.submittedHoursAgo ?? (seed.checkedInHoursAgo ?? 1) + 0.2),
    closedAt: seed.checkedOutHoursAgo !== undefined ? hoursAgo(seed.checkedOutHoursAgo) : null,
    checkedInAt: seed.checkedInHoursAgo !== undefined ? hoursAgo(seed.checkedInHoursAgo) : null,
    checkedOutAt: seed.checkedOutHoursAgo !== undefined ? hoursAgo(seed.checkedOutHoursAgo) : null,
    hotelAccessExpiresAt: null,
    expectedCheckOutDate: seed.dueOutDays === undefined ? null : dayKey(seed.dueOutDays),
    guestName: seed.guestName,
    companionCount: seed.companions,
    identityAccess: { isActive: seed.status !== "CHECKED_OUT", reason: seed.status === "CHECKED_OUT" ? "EXPIRED" : "ACTIVE", expiresAt: null },
  };
}

let roomCounter = 0;
function room(number: string, floor: string, roomType: string, status: HotelRoom["status"], rate: number): HotelRoom {
  roomCounter += 1;
  return { id: roomCounter, number, floor, roomType, status, isActive: true, nightlyRateMinor: rupees(rate) };
}

export const todayRooms: HotelRoom[] = [
  room("101", "1", "Courtyard Twin", "VACANT", 3800),
  room("102", "1", "Courtyard Twin", "OCCUPIED", 3800),
  room("103", "1", "Courtyard Twin", "CLEANING", 3800),
  room("104", "1", "Courtyard Twin", "MAINTENANCE", 3600),
  room("105", "1", "Courtyard Twin", "OCCUPIED", 3800),
  room("201", "2", "Heritage Deluxe", "VACANT", 5400),
  room("202", "2", "Heritage Deluxe", "OCCUPIED", 5400),
  room("203", "2", "Heritage Deluxe", "OCCUPIED", 5400),
  room("204", "2", "Heritage Deluxe", "VACANT", 5600),
  room("205", "2", "Heritage Deluxe", "CLEANING", 5400),
  room("206", "2", "Heritage Deluxe", "OCCUPIED", 5600),
  room("207", "2", "Heritage Deluxe", "OCCUPIED", 5400),
  room("301", "3", "Maharaja Suite", "OCCUPIED", 12800),
  room("302", "3", "Maharaja Suite", "VACANT", 12800),
  room("303", "3", "Maharaja Suite", "OCCUPIED", 14000),
  room("304", "3", "Heritage Deluxe", "VACANT", 6200),
  room("305", "3", "Heritage Deluxe", "OCCUPIED", 6200),
];

const roomRef = (number: string) => {
  const match = todayRooms.find((entry) => entry.number === number)!;
  return { id: match.id, number: match.number };
};

export const todayStays: HotelStayListItem[] = [
  // Waiting for a room (checked in on their phone).
  stay({ guestName: "Ananya Iyer", companions: 1, status: "PENDING_CHECK_IN", submittedHoursAgo: 0.4 }),
  stay({ guestName: "Rohan Mehta", companions: 3, status: "PENDING_CHECK_IN", submittedHoursAgo: 0.9 }),
  stay({ guestName: "Fatima Sheikh", companions: 0, status: "PENDING_CHECK_IN", submittedHoursAgo: 1.6 }),
  // Due out today / overdue.
  stay({ guestName: "Vikram Singh Rathore", companions: 1, status: "CHECKED_IN", room: roomRef("203"), checkedInHoursAgo: 50, dueOutDays: 0 }),
  stay({ guestName: "Meera Krishnan", companions: 2, status: "CHECKED_IN", room: roomRef("301"), checkedInHoursAgo: 74, dueOutDays: 0 }),
  stay({ guestName: "Arjun Kapoor", companions: 0, status: "CHECKED_IN", room: roomRef("102"), checkedInHoursAgo: 98, dueOutDays: -1 }),
  stay({ guestName: "Sneha Patil", companions: 1, status: "CHECKED_IN", room: roomRef("206"), checkedInHoursAgo: 28, dueOutDays: 0 }),
  // In house.
  stay({ guestName: "Kabir Malhotra", companions: 1, status: "CHECKED_IN", room: roomRef("202"), checkedInHoursAgo: 20, dueOutDays: 2 }),
  stay({ guestName: "Priya Raghunathan", companions: 2, status: "CHECKED_IN", room: roomRef("303"), checkedInHoursAgo: 6, dueOutDays: 3 }),
  stay({ guestName: "Daniel Fernandes", companions: 0, status: "CHECKED_IN", room: roomRef("105"), checkedInHoursAgo: 44, dueOutDays: 1 }),
  stay({ guestName: "Aisha Qureshi", companions: 1, status: "CHECKED_IN", room: roomRef("207"), checkedInHoursAgo: 3, dueOutDays: 4 }),
  stay({ guestName: "Harpreet Kaur Gill", companions: 3, status: "CHECKED_IN", room: roomRef("305"), checkedInHoursAgo: 26, dueOutDays: 2 }),
  // Left today.
  stay({ guestName: "Siddharth Rao", companions: 1, status: "CHECKED_OUT", room: roomRef("205"), checkedInHoursAgo: 52, checkedOutHoursAgo: 2 }),
  stay({ guestName: "Lakshmi Nair", companions: 0, status: "CHECKED_OUT", room: roomRef("103"), checkedInHoursAgo: 30, checkedOutHoursAgo: 3.5 }),
];

/** Room photos by room type, as Property settings would provide. */
export const roomTypePhotos: Record<string, string> = {
  "Courtyard Twin": photos.twin,
  "Heritage Deluxe": photos.heritage,
  "Maharaja Suite": photos.suite,
};

export const todayRevenue7DaysMinor = rupees(412_600);
export const todayOccupancy7Days = 71;

export const staffUser = { name: "Neha Sharma", firstName: "Neha", role: "Manager", email: "neha@rajwadahospitality.in" };
export const adminUser = { name: "Kabeer Joshi", role: "Super admin", email: "kabeer@tattwix.in" };
