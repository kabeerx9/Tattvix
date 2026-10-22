// Prototype-only fake data and helpers for the guest QR check-in exploration.
// Nothing here talks to the API; nothing in production imports this folder.

export type Scenario = "new" | "returning";

export type DocumentType = "AADHAAR" | "PASSPORT" | "DRIVING_LICENCE" | "VOTER_ID";

export type Profile = {
  firstName: string;
  lastName: string;
  phone: string; // 10 digits, +91 implied
  dateOfBirth: string; // yyyy-mm-dd
  nationality: "IN" | "OTHER";
  otherNationality: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
};

export type IdentityDocument = {
  type: DocumentType;
  number: string;
  expiryDate: string;
  frontCaptured: boolean;
  backCaptured: boolean;
};

export type Companion = {
  id: number;
  firstName: string;
  lastName: string;
  relationship: string;
  idEnding: string | null;
};

export type CheckInDraft = {
  profile: Profile;
  document: IdentityDocument;
  companions: Companion[];
  selectedCompanionIds: number[];
};

// The cover stands in for a property photo uploaded in Property settings
// (real data in production). This repo's travel image is used only because
// the prototype has no API.
export const hotel = {
  name: "Aravali Courtyard Resort",
  city: "Udaipur",
  address: "Badi Road, near Fateh Sagar Lake, Udaipur, Rajasthan 313001",
  phone: "+91 294 245 1180",
  checkInTime: "12:00",
  checkOutTime: "11:00",
  rateFrom: "₹3,800",
  rateTo: "₹7,200",
  amenities: ["Pool", "Breakfast", "Airport pickup", "Wi-Fi"],
  cover: "/images/travel/hotel-facade.webp",
} as const;

export const accessPolicy = { maximumDays: 7, postCheckoutGraceHours: 24 } as const;

export const assignedRoom = { number: "204", type: "Lake view deluxe" } as const;

const emptyProfile: Profile = {
  firstName: "",
  lastName: "",
  phone: "",
  dateOfBirth: "",
  nationality: "IN",
  otherNationality: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
};

const emptyDocument: IdentityDocument = {
  type: "AADHAAR",
  number: "",
  expiryDate: "",
  frontCaptured: false,
  backCaptured: false,
};

/** What a guest has after signing in: a new guest gets name + phone from the account only. */
export function initialDraft(scenario: Scenario): CheckInDraft {
  if (scenario === "new") {
    return {
      profile: { ...emptyProfile, firstName: "Ananya", lastName: "Sharma", phone: "9820145673" },
      document: { ...emptyDocument },
      companions: [],
      selectedCompanionIds: [],
    };
  }
  return {
    profile: {
      firstName: "Ananya",
      lastName: "Sharma",
      phone: "9820145673",
      dateOfBirth: "1992-08-14",
      nationality: "IN",
      otherNationality: "",
      addressLine1: "702, Sea Breeze Apartments, Carter Road, Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400050",
    },
    document: {
      type: "AADHAAR",
      number: "538274914821",
      expiryDate: "",
      frontCaptured: true,
      backCaptured: true,
    },
    companions: [
      { id: 1, firstName: "Rohan", lastName: "Sharma", relationship: "Spouse", idEnding: "3307" },
      { id: 2, firstName: "Meera", lastName: "Sharma", relationship: "Daughter, 7", idEnding: null },
    ],
    selectedCompanionIds: [],
  };
}

export const documentTypes: { value: DocumentType; label: string; short: string }[] = [
  { value: "AADHAAR", label: "Aadhaar card", short: "Aadhaar" },
  { value: "PASSPORT", label: "Passport", short: "Passport" },
  { value: "DRIVING_LICENCE", label: "Driving licence", short: "Licence" },
  { value: "VOTER_ID", label: "Voter ID", short: "Voter ID" },
];

export const documentRules: Record<
  DocumentType,
  { expiryRequired: boolean; backRequired: boolean; numberLength: number; numberHint: string }
> = {
  AADHAAR: { expiryRequired: false, backRequired: true, numberLength: 12, numberHint: "12 digits" },
  PASSPORT: { expiryRequired: true, backRequired: false, numberLength: 8, numberHint: "Letter + 7 digits, e.g. T1234567" },
  DRIVING_LICENCE: { expiryRequired: true, backRequired: true, numberLength: 15, numberHint: "15 characters, e.g. MH0220190012345" },
  VOTER_ID: { expiryRequired: false, backRequired: true, numberLength: 10, numberHint: "10 characters, e.g. ABC1234567" },
};

export type ProfileField = keyof Profile;

export const profileFieldLabels: Partial<Record<ProfileField, string>> = {
  firstName: "First name",
  lastName: "Last name",
  phone: "Mobile number",
  dateOfBirth: "Date of birth",
  otherNationality: "Nationality",
  addressLine1: "Address",
  city: "City",
  state: "State",
  postalCode: "PIN code",
};

export function profileErrors(profile: Profile): Partial<Record<ProfileField, string>> {
  const errors: Partial<Record<ProfileField, string>> = {};
  if (!profile.firstName.trim()) errors.firstName = "Enter your first name as on your ID";
  if (!profile.lastName.trim()) errors.lastName = "Enter your last name as on your ID";
  if (!/^[6-9]\d{9}$/.test(profile.phone)) errors.phone = "Enter a 10-digit mobile number";
  if (!profile.dateOfBirth) errors.dateOfBirth = "Enter your date of birth";
  if (profile.nationality === "OTHER" && !profile.otherNationality.trim())
    errors.otherNationality = "Enter your nationality";
  if (!profile.addressLine1.trim()) errors.addressLine1 = "Enter your home address";
  if (!profile.city.trim()) errors.city = "Enter your city";
  if (!profile.state.trim()) errors.state = "Enter your state";
  if (!/^\d{6}$/.test(profile.postalCode)) errors.postalCode = "Enter a 6-digit PIN code";
  return errors;
}

/** Split for paced flows: identity fields first, address second. */
export const personalFields: ProfileField[] = ["firstName", "lastName", "phone", "dateOfBirth", "otherNationality"];
export const addressFields: ProfileField[] = ["addressLine1", "city", "state", "postalCode"];

export type DocumentField = "number" | "expiryDate" | "frontCaptured" | "backCaptured";

export function documentErrors(document: IdentityDocument): Partial<Record<DocumentField, string>> {
  const rules = documentRules[document.type];
  const errors: Partial<Record<DocumentField, string>> = {};
  const number = document.number.replace(/\s/g, "");
  if (number.length !== rules.numberLength) errors.number = `Enter the ${rules.numberHint.split(",")[0].toLowerCase()}`;
  if (rules.expiryRequired) {
    if (!document.expiryDate) errors.expiryDate = "Enter the expiry date";
    else if (document.expiryDate < today()) errors.expiryDate = "This document has expired";
  }
  if (!document.frontCaptured) errors.frontCaptured = "Add a photo of the front";
  if (rules.backRequired && !document.backCaptured) errors.backCaptured = "Add a photo of the back";
  return errors;
}

export function countErrors(errors: object) {
  return Object.keys(errors).length;
}

export function formatDocumentNumber(type: DocumentType, raw: string) {
  if (type === "AADHAAR") {
    const digits = raw.replace(/\D/g, "").slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  }
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, documentRules[type].numberLength);
}

export function documentEnding(document: IdentityDocument) {
  return document.number.replace(/\s/g, "").slice(-4);
}

/** Aadhaar is never shown in full once saved: XXXX XXXX 4821. */
export function maskedDocumentNumber(document: IdentityDocument) {
  const ending = documentEnding(document);
  if (document.type === "AADHAAR") return `XXXX XXXX ${ending}`;
  return `•••• ${ending}`;
}

export function documentLabel(document: IdentityDocument) {
  const type = documentTypes.find((t) => t.value === document.type)!.label;
  return `${type} ending ${documentEnding(document)}`;
}

export function formatPhone(phone: string) {
  if (phone.length !== 10) return phone ? `+91 ${phone}` : "";
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
}

export function formatDate(iso: string) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${iso}T00:00:00`),
  );
}

export function fullName(p: { firstName: string; lastName: string }) {
  return [p.firstName, p.lastName].filter(Boolean).join(" ");
}

export function initials(p: { firstName: string; lastName: string }) {
  return `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase();
}

export function nationalityLabel(profile: Profile) {
  return profile.nationality === "IN" ? "Indian" : profile.otherNationality;
}

export function accessEndsLabel() {
  const end = new Date();
  end.setDate(end.getDate() + accessPolicy.maximumDays);
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(end);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export const relationshipOptions = ["Spouse", "Child", "Parent", "Sibling", "Friend", "Colleague"];
