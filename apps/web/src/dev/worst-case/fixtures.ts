/**
 * Dev-only fixtures for the guest-screen worst-case harness
 * (apps/web/worst-case.html). Never imported by the production entry.
 *
 * Every value is either a realistic Indian guest/hotel value or the
 * schema limit from @tattvix/contracts. Responses are validated by the same
 * zod schemas the real API client uses, so a fixture that drifts from the
 * contract fails loudly instead of rendering impossible data.
 */
import type {
  CheckInContext,
  CompanionProfile,
  GuestProfileResponse,
  GuestShare,
  IdentityDocument,
  MeResponse,
  StayBill,
} from "@tattvix/contracts";

export type Dataset = "demo" | "worst" | "empty" | "one";
export const datasets: Dataset[] = ["demo", "worst", "empty", "one"];

const now = Date.now();
const iso = (offsetHours: number) =>
  new Date(now + offsetHours * 3_600_000).toISOString();
/** A calendar date `offsetDays` from today, as YYYY-MM-DD. */
const isoDay = (offsetDays: number) =>
  new Date(now + offsetDays * 86_400_000).toISOString().slice(0, 10);
const uuid = (n: number) =>
  `9f8e7d6c-5b4a-4c3d-8e2f-${String(n).padStart(12, "0")}`;

function me(overrides: Partial<MeResponse>): MeResponse {
  return {
    id: 1,
    clerkId: "user_dev_worst_case",
    email: "asha@example.com",
    firstName: "Asha",
    lastName: "Rao",
    username: "",
    imageUrl: "",
    createdAt: iso(-24 * 90),
    updatedAt: iso(-24),
    lastSyncedAt: null,
    platformRole: null,
    platformPermissions: [],
    memberships: [],
    ...overrides,
  };
}

const emptyProfile: GuestProfileResponse["profile"] = {
  legalFirstName: "",
  legalLastName: "",
  phoneNumber: "",
  dateOfBirth: null,
  nationality: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateRegion: "",
  postalCode: "",
  country: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

function document(
  id: number,
  overrides: Partial<IdentityDocument>,
): IdentityDocument {
  return {
    id,
    documentType: "AADHAAR",
    documentNumber: "4821 7730 1956",
    nameOnDocument: "Asha Rao",
    issuingCountry: "IN",
    expiryDate: null,
    requirements: { expiryDateRequired: false, backImageRequired: true },
    images: {
      front: { isUploaded: true, contentType: "image/webp", contentLength: 182_000 },
      back: { isUploaded: true, contentType: "image/webp", contentLength: 176_000 },
    },
    readiness: { isReady: true, missingFields: [] },
    createdAt: iso(-24 * 30),
    updatedAt: iso(-24 * 2),
    ...overrides,
  };
}

function companion(
  id: number,
  overrides: Partial<CompanionProfile>,
): CompanionProfile {
  return {
    id,
    legalFirstName: "Kiran",
    legalLastName: "Rao",
    dateOfBirth: "1988-04-12",
    relationship: "Spouse",
    nationality: "IN",
    isMinor: false,
    readiness: { isReady: true, missingFields: [] },
    createdAt: iso(-24 * 20),
    updatedAt: iso(-24 * 2),
    ...overrides,
  };
}

const property = (
  id: number,
  name: string,
  organizationName: string,
  details?: GuestShare["property"]["details"],
): GuestShare["property"] => ({
  id,
  name,
  slug: `property-${id}`,
  organization: { id, name: organizationName, slug: `org-${id}` },
  ...(details ? { details } : {}),
});

function stay(n: number, overrides: Partial<GuestShare>): GuestShare {
  return {
    id: uuid(n),
    status: "SUBMITTED",
    operationalStatus: "CHECKED_IN",
    room: { id: n, number: "204" },
    submittedAt: iso(-30),
    closedAt: null,
    checkedInAt: iso(-28),
    checkedOutAt: null,
    hotelAccessExpiresAt: iso(24 * 6),
    property: property(n, "Lakeview Residency", "Lakeview Hotels"),
    accessEvents: [],
    ...overrides,
  };
}

const longHotel =
  "Shree Venkateshwara Grand Heritage Palace Hotel & Convention Centre, Tirupati";
const devanagariHotel = "होटल राजमहल पैलेस एवं हेरिटेज रिसॉर्ट, उदयपुर";
const longOrg =
  "Sri Lakshmi Narasimha Hospitality and Tourism Development Private Limited";

const worstProperty = property(1, longHotel, longOrg, {
  address:
    "Survey No. 114/2B, Opp. Sri Padmavathi Ammavari Temple, Near Alipiri Footpath Gate, Tiruchanur Road, Karakambadi Panchayat, Renigunta Mandal, Tirupati (Urban), Tirupati District, Andhra Pradesh 517503",
  contactPhone: "+91 877-226-4555-1204",
  description:
    "A 240-room heritage property five minutes from the Alipiri footpath. Darshan ticket desk, pure-vegetarian kitchen, laundry, airport pickup and a 24-hour front desk. शुद्ध शाकाहारी भोजन उपलब्ध। 🙏",
  amenities: [
    "Pure-vegetarian multi-cuisine restaurant",
    "Free Wi-Fi",
    "Airport and railway-station pickup",
    "Darshan booking assistance",
    "Laundry",
    "Power backup",
    "Lift",
    "Parking for buses and tempo travellers",
    "Doctor on call",
    "Wheelchair access",
    "स्नान हेतु गर्म पानी",
    "🧘 Yoga room",
  ],
  checkInTime: "12:00",
  checkOutTime: "11:00",
  currency: "INR",
  nightlyRateFromMinor: 149_900,
  nightlyRateToMinor: 100_000_000,
});

const worstAccessEvents: GuestShare["accessEvents"] = [
  { action: "DETAILS_VIEWED", imageSide: null, createdAt: iso(-27) },
  { action: "DETAILS_VIEWED", imageSide: null, createdAt: iso(-20) },
  { action: "DOCUMENT_VIEWED", imageSide: "FRONT", createdAt: iso(-27) },
  { action: "DOCUMENT_VIEWED", imageSide: "BACK", createdAt: iso(-27) },
  {
    action: "DOCUMENT_VIEWED",
    imageSide: "FRONT",
    companionId: 101,
    companionName: "Venkata Satya Sai Lakshmi Narasimha Chakravarthula",
    createdAt: iso(-26),
  },
  {
    action: "DOCUMENT_VIEWED",
    imageSide: "BACK",
    companionId: 103,
    companionName: "प्रियंका शर्मा",
    createdAt: iso(-26),
  },
  { action: "STAY_CLOSED", imageSide: null, createdAt: iso(-25) },
];

const worstStays: GuestShare[] = [
  stay(1, {
    property: worstProperty,
    room: { id: 1, number: "PH-1204-A (Annexe, 12th floor)" },
    accessEvents: worstAccessEvents,
  }),
  stay(2, {
    operationalStatus: "PENDING_CHECK_IN",
    room: null,
    checkedInAt: null,
    property: property(2, devanagariHotel, "राजमहल होटल्स प्राइवेट लिमिटेड"),
  }),
  stay(3, {
    status: "REVOKED",
    operationalStatus: "CHECKED_IN",
    room: { id: 3, number: "1" },
    hotelAccessExpiresAt: null,
    property: property(3, "OYO 1", "O"),
  }),
  stay(4, {
    status: "CLOSED",
    operationalStatus: "CHECKED_OUT",
    checkedOutAt: iso(-24 * 400),
    checkedInAt: iso(-24 * 403),
    submittedAt: iso(-24 * 403),
    hotelAccessExpiresAt: iso(-24 * 399),
    property: property(
      4,
      "TheLeelaPalaceBengaluruOldAirportRoadHAL2ndStageIndiranagar",
      "Leela Palaces, Hotels and Resorts",
    ),
  }),
];

const worstBill: StayBill = {
  currency: "INR",
  isFinal: false,
  roomNights: 365,
  nightlyRateMinor: 100_000_000,
  items: [
    {
      id: uuid(901),
      kind: "ROOM",
      description: "Room charge — Presidential Suite (Annexe, 12th floor)",
      quantity: 365,
      unitPriceMinor: 100_000_000,
      lineTotalMinor: 36_500_000_000,
      createdAt: iso(-28),
      voidedAt: null,
      voidReason: "",
    },
    {
      id: uuid(902),
      kind: "EXTRA",
      description:
        "Laundry and dry-cleaning: 2 silk sarees, 1 sherwani, 3 kurta-pyjama sets, express same-day service requested at 11:40 pm by guest (room service ticket #RS-2026-10-0012345)",
      quantity: 9999,
      unitPriceMinor: 4_950,
      lineTotalMinor: 49_495_050,
      createdAt: iso(-20),
      voidedAt: null,
      voidReason: "",
    },
    {
      id: uuid(903),
      kind: "EXTRA",
      description: "मिनी बार — पानी की बोतल",
      quantity: 1,
      unitPriceMinor: 2_000,
      lineTotalMinor: 2_000,
      createdAt: iso(-10),
      voidedAt: iso(-9),
      voidReason:
        "Guest disputed the charge; front-desk manager approved the reversal after checking the minibar log",
    },
  ],
  totalMinor: 36_549_495_050,
};

const worstCompanions: CompanionProfile[] = [
  companion(101, {
    legalFirstName: "Venkata Satya Sai Lakshmi Narasimha",
    legalLastName: "Chakravarthula",
    relationship: "Father-in-law (travelling for cataract surgery follow-up)",
  }),
  companion(102, {
    legalFirstName: "J",
    legalLastName: "",
    dateOfBirth: null,
    relationship: "",
    nationality: "",
    isMinor: null,
    readiness: {
      isReady: false,
      missingFields: [
        "legalLastName",
        "dateOfBirth",
        "relationship",
        "nationality",
      ],
    },
  }),
  companion(103, {
    legalFirstName: "प्रियंका",
    legalLastName: "शर्मा",
    relationship: "बहन",
  }),
  companion(104, {
    legalFirstName: "",
    legalLastName: "",
    dateOfBirth: null,
    relationship: "",
    nationality: "",
    isMinor: null,
    readiness: {
      isReady: false,
      missingFields: [
        "legalFirstName",
        "legalLastName",
        "dateOfBirth",
        "relationship",
        "nationality",
      ],
    },
  }),
  companion(105, {
    legalFirstName: "🦋 Anaya",
    legalLastName: "Iyer",
    dateOfBirth: "2019-02-28",
    relationship: "Daughter",
    isMinor: true,
  }),
  companion(106, {
    legalFirstName: "Mohammed Abdul",
    legalLastName: "Rahman Siddiqui-Qureshi",
    relationship: "Driver",
  }),
  ...Array.from({ length: 14 }, (_, index) =>
    companion(110 + index, {
      legalFirstName: `Tour group member ${index + 1}`,
      legalLastName: "Yatra",
      relationship: "Pilgrimage group",
    }),
  ),
];

const worstDocuments: IdentityDocument[] = [
  document(201, {
    documentType: "PASSPORT",
    documentNumber: "Z12345678",
    nameOnDocument:
      "VENKATA SATYA SAI LAKSHMI NARASIMHA SWAMY CHAKRAVARTHULA",
    expiryDate: "2031-06-30",
    requirements: { expiryDateRequired: true, backImageRequired: false },
    images: {
      front: { isUploaded: true, contentType: "image/webp", contentLength: 182_000 },
      back: { isUploaded: false, contentType: "", contentLength: null },
    },
  }),
  document(202, {
    documentType: "",
    documentNumber: "",
    nameOnDocument: "",
    issuingCountry: "",
    images: {
      front: { isUploaded: false, contentType: "", contentLength: null },
      back: { isUploaded: false, contentType: "", contentLength: null },
    },
    readiness: {
      isReady: false,
      missingFields: [
        "documentType",
        "documentNumber",
        "nameOnDocument",
        "issuingCountry",
        "expiryDate",
        "frontImage",
        "backImage",
      ],
    },
  }),
  document(203, { documentType: "VOTER_ID", documentNumber: "AB1" }),
  document(204, {
    documentType: "DRIVING_LICENCE",
    documentNumber: "MH12 20110012345",
    nameOnDocument: "Venkata S. L. N. Chakravarthula",
    expiryDate: isoDay(12),
    requirements: { expiryDateRequired: true, backImageRequired: true },
  }),
  document(205, {
    documentType: "PASSPORT",
    documentNumber: "K9876543",
    expiryDate: isoDay(-40),
    requirements: { expiryDateRequired: true, backImageRequired: false },
    images: {
      front: { isUploaded: true, contentType: "image/jpeg", contentLength: 240_000 },
      back: { isUploaded: false, contentType: "", contentLength: null },
    },
    readiness: { isReady: false, missingFields: ["expiryDate"] },
  }),
];

const worstProfile: GuestProfileResponse = {
  profile: {
    legalFirstName: "Venkata Satya Sai Lakshmi Narasimha Swamy",
    legalLastName: "Chakravarthula",
    phoneNumber: "+91 98765 43210",
    dateOfBirth: "1962-08-15",
    nationality: "IN",
    addressLine1:
      "Flat No. 1204, Tower B-7, Prestige Lakeside Habitat, Varthur Hobli, Gunjur Village",
    addressLine2: "Opp. Sri Kanakadasa Kalyana Mantapa, Near Whitefield Railway Station",
    city: "Bengaluru (Bangalore) Urban",
    stateRegion: "कर्नाटक",
    postalCode: "560087",
    country: "IN",
    emergencyContactName: "J",
    emergencyContactPhone: "",
  },
  // Ready, so the check-in harness reaches the companion picker with 20 companions.
  readiness: { isReady: true, missingFields: [] },
  updatedAt: iso(-24),
};

const worstMe = me({
  firstName: "",
  lastName: "",
  username: "",
  email:
    "venkata.satyasai.narasimhaswamy.chakravarthula@tirupati-pilgrim-services.example.com",
});

function checkInContext(
  token: string,
  data: DatasetData,
): CheckInContext {
  const shares = data.shares;
  const existing =
    token === "existing" ? (shares[3] ?? shares[0] ?? null) : null;
  const propertyForToken = existing?.property ?? shares[0]?.property ??
    property(9, "Lakeview Residency", "Lakeview Hotels");
  return {
    property:
      data.name === "worst" ? worstProperty : propertyForToken,
    tokenExpiresAt: iso(1),
    accessPolicy: { maximumDays: 30, postCheckoutGraceHours: 24 },
    existingStay: existing
      ? {
          id: existing.id,
          status: existing.status,
          operationalStatus: existing.operationalStatus,
          room: existing.room,
          submittedAt: existing.submittedAt,
          closedAt: existing.closedAt,
          checkedInAt: existing.checkedInAt,
          checkedOutAt: existing.checkedOutAt,
          hotelAccessExpiresAt: existing.hotelAccessExpiresAt,
        }
      : null,
  };
}

export type DatasetData = {
  name: Dataset;
  me: MeResponse;
  profile: GuestProfileResponse;
  documents: IdentityDocument[];
  companions: CompanionProfile[];
  shares: GuestShare[];
  bill: (stayId: string) => StayBill;
  checkIn: (token: string) => CheckInContext;
};

const demoBill: StayBill = {
  currency: "INR",
  isFinal: false,
  roomNights: 2,
  nightlyRateMinor: 450_000,
  items: [
    {
      id: uuid(801),
      kind: "ROOM",
      description: "Room charge",
      quantity: 2,
      unitPriceMinor: 450_000,
      lineTotalMinor: 900_000,
      createdAt: iso(-28),
      voidedAt: null,
      voidReason: "",
    },
  ],
  totalMinor: 900_000,
};

const emptyBill: StayBill = {
  currency: "INR",
  isFinal: false,
  roomNights: null,
  nightlyRateMinor: null,
  items: [],
  totalMinor: 0,
};

function build(name: Dataset): DatasetData {
  const base = {
    demo: {
      me: me({}),
      profile: {
        profile: {
          ...emptyProfile,
          legalFirstName: "Asha",
          legalLastName: "Rao",
          phoneNumber: "+91 98765 43210",
          dateOfBirth: "1990-01-01",
          nationality: "IN",
          addressLine1: "12 MG Road",
          city: "Bengaluru",
          stateRegion: "Karnataka",
          postalCode: "560001",
          country: "IN",
        },
        readiness: { isReady: true, missingFields: [] },
        updatedAt: iso(-24),
      } satisfies GuestProfileResponse,
      documents: [
        document(201, {}),
        document(206, {
          documentType: "PASSPORT",
          documentNumber: "Z4471902",
          expiryDate: isoDay(365 * 6),
          requirements: { expiryDateRequired: true, backImageRequired: false },
          images: {
            front: { isUploaded: true, contentType: "image/jpeg", contentLength: 240_000 },
            back: { isUploaded: false, contentType: "", contentLength: null },
          },
        }),
      ],
      companions: [companion(101, {}), companion(102, { legalFirstName: "Meera", relationship: "Daughter", isMinor: true })],
      shares: [
        stay(1, {}),
        stay(2, {
          status: "CLOSED",
          operationalStatus: "CHECKED_OUT",
          checkedOutAt: iso(-24 * 20),
          hotelAccessExpiresAt: iso(-24 * 19),
          property: property(2, "Seaside Inn", "Seaside Hotels"),
        }),
      ],
      bill: () => demoBill,
    },
    worst: {
      me: worstMe,
      profile: worstProfile,
      documents: worstDocuments,
      companions: worstCompanions,
      shares: worstStays,
      bill: (stayId: string) => (stayId === uuid(1) ? worstBill : emptyBill),
    },
    empty: {
      me: me({ firstName: "J", lastName: "" }),
      profile: {
        profile: emptyProfile,
        readiness: {
          isReady: false,
          missingFields: [
            "legalFirstName",
            "legalLastName",
            "phoneNumber",
            "dateOfBirth",
            "nationality",
            "addressLine1",
            "city",
            "stateRegion",
            "postalCode",
            "country",
            "identityDocuments",
          ],
        },
        updatedAt: null,
      } satisfies GuestProfileResponse,
      documents: [],
      companions: [],
      shares: [],
      bill: () => emptyBill,
    },
    one: {
      me: me({ firstName: "Jo", lastName: "" }),
      profile: {
        profile: { ...emptyProfile, legalFirstName: "Jo" },
        readiness: {
          isReady: false,
          missingFields: ["legalLastName"],
        },
        updatedAt: iso(-1),
      } satisfies GuestProfileResponse,
      documents: [
        document(201, {
          readiness: { isReady: false, missingFields: ["backImage"] },
          images: {
            front: { isUploaded: true, contentType: "image/webp", contentLength: 1 },
            back: { isUploaded: false, contentType: "", contentLength: null },
          },
        }),
      ],
      companions: [
        companion(101, {
          readiness: { isReady: false, missingFields: ["relationship"] },
          relationship: "",
        }),
      ],
      shares: [
        stay(1, {
          operationalStatus: "CHECKED_OUT",
          checkedOutAt: iso(-2),
          accessEvents: [
            { action: "DETAILS_VIEWED", imageSide: null, createdAt: iso(-27) },
          ],
        }),
      ],
      bill: () => ({
        ...demoBill,
        roomNights: 1,
        items: [{ ...demoBill.items[0]!, quantity: 1, lineTotalMinor: 450_000 }],
        totalMinor: 450_000,
        isFinal: true,
      }),
    },
  }[name];

  const data: DatasetData = {
    name,
    ...base,
    checkIn: (token) => checkInContext(token, data),
  };
  return data;
}

export function getDataset(name: Dataset): DatasetData {
  return build(name);
}

/** Companion documents: the first companion carries the worst-case set. */
export function companionDocuments(data: DatasetData, companionId: number) {
  if (data.name === "worst" && companionId === 101) return worstDocuments;
  return data.documents.slice(0, 1);
}
