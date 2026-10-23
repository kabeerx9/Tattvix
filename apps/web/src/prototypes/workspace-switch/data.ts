// Mock accounts for the workspace-switch prototypes. Each case is a real
// `MeResponse` (contracts), so the production nav and permission helpers in
// lib/workspace-navigation.ts run on it unchanged. Fake data only.
import type { MeResponse, Permission } from "@tattvix/contracts";

const photo = (id: string, w = 640) =>
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
  suite: photo("1590490360182-c33d57733427"),
  heritage: photo("1618773928121-c32242e63f39"),
  villa: photo("1584132967334-10e028bd69f7"),
} as const;

type PropertySeed = { name: string; slug: string; city: string; photo: string | null };

/** Property facts the shell can show beside the membership (city, cover). */
export const propertyFacts: Record<string, { city: string; photo: string | null }> = {};

const owner: Permission[] = [
  "hotel:view",
  "hotel:manage",
  "members:view",
  "members:manage",
  "stays:view",
  "stays:update",
  "rooms:view",
  "rooms:manage",
  "rooms:assign",
  "reports:view",
];
const reception: Permission[] = ["hotel:view", "stays:view", "stays:update", "rooms:view", "rooms:assign"];

let nextId = 1;
function membership(
  org: { name: string; slug: string },
  role: "OWNER" | "MANAGER" | "RECEPTION",
  properties: PropertySeed[],
): MeResponse["memberships"][number] {
  for (const property of properties) propertyFacts[`${org.slug}/${property.slug}`] = { city: property.city, photo: property.photo };
  return {
    id: nextId++,
    role,
    hasAllProperties: role === "OWNER",
    permissions: role === "RECEPTION" ? reception : owner,
    organization: { id: nextId++, name: org.name, slug: org.slug },
    properties: properties.map((property) => ({ id: nextId++, name: property.name, slug: property.slug })),
  };
}

const rajwada = { name: "Rajwada Hospitality", slug: "rajwada" };
const himalayan = { name: "Himalayan Inns", slug: "himalayan-inns" };
const malabar = { name: "Malabar Retreats", slug: "malabar" };

const rajwadaThree: PropertySeed[] = [
  { name: "Umaid Niwas Haveli", slug: "umaid-niwas", city: "Jaipur", photo: photos.haveli },
  { name: "Lakeview Residency", slug: "lakeview", city: "Udaipur", photo: photos.udaipur },
  { name: "Sea Breeze Candolim", slug: "sea-breeze", city: "Goa", photo: photos.goa },
];
const himalayanThree: PropertySeed[] = [
  { name: "The Ridge, Mall Road", slug: "the-ridge", city: "Shimla", photo: photos.shimla },
  { name: "Ganga Ghat Inn", slug: "ganga-ghat", city: "Rishikesh", photo: null },
  { name: "Cedar Court", slug: "cedar-court", city: "Mussoorie", photo: photos.lobby },
];

function me(overrides: Partial<MeResponse>): MeResponse {
  return {
    id: 7,
    clerkId: "user_proto",
    email: "neha@rajwadahospitality.in",
    firstName: "Neha",
    lastName: "Sharma",
    username: "",
    imageUrl: "",
    createdAt: "2026-01-04T09:00:00Z",
    updatedAt: "2026-10-20T09:00:00Z",
    lastSyncedAt: null,
    platformRole: null,
    platformPermissions: [],
    memberships: [],
    ...overrides,
  };
}

export type DataCase = "guest" | "one" | "two-orgs" | "many" | "admin";

export const dataCases: { key: DataCase; label: string; user: MeResponse }[] = [
  { key: "guest", label: "Guest only", user: me({ firstName: "Asha", lastName: "Rao", email: "asha@example.com" }) },
  {
    key: "one",
    label: "1 hotel",
    user: me({ memberships: [membership({ name: "Umaid Niwas Haveli", slug: "umaid-niwas-haveli" }, "OWNER", [rajwadaThree[0]!])] }),
  },
  {
    key: "two-orgs",
    label: "2 orgs × 3",
    user: me({ memberships: [membership(rajwada, "OWNER", rajwadaThree), membership(himalayan, "RECEPTION", himalayanThree)] }),
  },
  {
    key: "many",
    label: "11 hotels",
    user: me({
      memberships: [
        membership(rajwada, "OWNER", [
          ...rajwadaThree,
          { name: "Bandra Bay Suites", slug: "bandra-bay", city: "Mumbai", photo: photos.mumbai },
          { name: "Pushkar Camp", slug: "pushkar-camp", city: "Pushkar", photo: photos.villa },
          { name: "Jodhpur Blue House", slug: "blue-house", city: "Jodhpur", photo: photos.heritage },
        ]),
        membership(himalayan, "RECEPTION", himalayanThree),
        membership(malabar, "MANAGER", [
          { name: "Kumarakom Backwater Retreat", slug: "kumarakom", city: "Kumarakom", photo: photos.kerala },
          { name: "Fort Kochi Bungalow", slug: "fort-kochi", city: "Kochi", photo: photos.pool },
        ]),
      ],
    }),
  },
  {
    key: "admin",
    label: "Platform admin",
    user: me({
      firstName: "Kabeer",
      lastName: "Joshi",
      email: "kabeer@tattwix.in",
      platformRole: "SUPER_ADMIN",
      platformPermissions: ["platform:admin"],
      memberships: [membership(rajwada, "OWNER", rajwadaThree), membership(himalayan, "RECEPTION", himalayanThree)],
    }),
  },
];

/** A guest's own stays, for the personal home ("My stays"). */
export const myStays = [
  { id: "s1", property: "Sea Breeze Candolim", city: "Goa", dates: "14 – 17 Nov", status: "Upcoming", photo: photos.goa },
  { id: "s2", property: "The Ridge, Mall Road", city: "Shimla", dates: "2 – 4 Oct", status: "Checked out", photo: photos.shimla },
  { id: "s3", property: "Kumarakom Backwater Retreat", city: "Kumarakom", dates: "18 – 21 Aug", status: "Checked out", photo: photos.kerala },
];

/** Today's arrivals for any hotel home; names rotate per property so a switch visibly changes data. */
const guestNames = [
  "Fatima Sheikh",
  "Rohan Mehta",
  "Ananya Iyer",
  "Vikram Singh",
  "Meera Nair",
  "Arjun Kapoor",
  "Priya Desai",
  "Kabir Malhotra",
];
export function arrivalsFor(slug: string) {
  const seed = [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Array.from({ length: 4 }, (_, i) => ({
    name: guestNames[(seed + i * 3) % guestNames.length]!,
    detail: i === 0 ? "No room yet · 2 guests" : `Room ${100 + ((seed + i * 7) % 40)} · ${1 + ((seed + i) % 3)} guests`,
    status: i === 0 ? ("waiting" as const) : i === 3 ? ("out" as const) : ("in" as const),
  }));
}
export function statsFor(slug: string) {
  const seed = [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rooms = 12 + (seed % 30);
  const occupied = Math.round(rooms * (0.55 + (seed % 30) / 100));
  return { rooms, occupied, arrivals: 2 + (seed % 5), departures: 1 + (seed % 4) };
}
