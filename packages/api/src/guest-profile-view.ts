// Read view of the guest travel profile, shared by both clients: what each
// section shows, which fields its edit sheet holds, and check-in readiness.
import type { CompanionProfile, CompanionProfileMissingField, GuestProfileInput, GuestProfileMissingField } from "@tattvix/contracts";

import { countryName } from "./countries";
import { formatDate } from "./guest-format";

export type ProfileSectionKey = "personal" | "address" | "emergency";

/** The fields each section's edit sheet holds. */
export const profileSectionFields: Record<ProfileSectionKey, (keyof GuestProfileInput)[]> = {
  personal: ["legalFirstName", "legalLastName", "phoneNumber", "dateOfBirth", "nationality"],
  address: ["addressLine1", "addressLine2", "city", "stateRegion", "postalCode", "country"],
  emergency: ["emergencyContactName", "emergencyContactPhone"],
};

export const profileSectionTitles: Record<ProfileSectionKey, string> = {
  personal: "Personal details",
  address: "Home address",
  emergency: "Emergency contact",
};

/** Neutral line icon for a fact; each client maps the name to its own Lucide component. */
export type FactIcon = "name" | "phone" | "birthday" | "nationality" | "address" | "contact" | "relationship" | "room" | "requested" | "checkedIn" | "checkedOut" | "nights";

export type ProfileFact = { label: string; value: string | null; icon: FactIcon };

const joined = (parts: (string | null | undefined)[], separator: string) => parts.map((part) => part?.trim()).filter(Boolean).join(separator) || null;

/** Label and value pairs per section; a null value means "not added yet". */
export function getProfileSections(profile: GuestProfileInput): { key: ProfileSectionKey; title: string; facts: ProfileFact[] }[] {
  const country = (code: string) => (code.trim() ? countryName(code) : null);
  return [
    {
      key: "personal",
      title: profileSectionTitles.personal,
      facts: [
        { label: "Legal name", value: joined([profile.legalFirstName, profile.legalLastName], " "), icon: "name" },
        { label: "Phone", value: joined([profile.phoneNumber], ""), icon: "phone" },
        { label: "Date of birth", value: profile.dateOfBirth ? formatDate(profile.dateOfBirth) : null, icon: "birthday" },
        { label: "Nationality", value: country(profile.nationality), icon: "nationality" },
      ],
    },
    {
      key: "address",
      title: profileSectionTitles.address,
      facts: [
        {
          label: "Address",
          value: joined(
            [
              joined([profile.addressLine1, profile.addressLine2], ", "),
              joined([profile.city, joined([profile.stateRegion, profile.postalCode], " ")], ", "),
              country(profile.country),
            ],
            "\n",
          ),
          icon: "address",
        },
      ],
    },
    {
      key: "emergency",
      title: profileSectionTitles.emergency,
      facts: [{ label: "Contact", value: joined([profile.emergencyContactName, profile.emergencyContactPhone], " · "), icon: "contact" }],
    },
  ];
}

export const profileMissingFieldLabels: Record<GuestProfileMissingField, string> = {
  legalFirstName: "Legal first name",
  legalLastName: "Legal last name",
  phoneNumber: "Phone number",
  dateOfBirth: "Date of birth",
  nationality: "Nationality",
  addressLine1: "Address",
  city: "City",
  stateRegion: "State or region",
  postalCode: "Postal code",
  country: "Country",
  identityDocuments: "A government ID",
};

const requiredCount = Object.keys(profileMissingFieldLabels).length;

/** How close the guest is to a one-scan check-in. */
export function getProfileReadiness(missing: GuestProfileMissingField[]) {
  const completed = requiredCount - missing.length;
  return {
    ready: missing.length === 0,
    completed,
    total: requiredCount,
    percent: Math.round((completed / requiredCount) * 100),
    missing: missing.map((field) => profileMissingFieldLabels[field]),
  };
}

export const companionMissingFieldLabels: Record<CompanionProfileMissingField, string> = {
  legalFirstName: "Legal first name",
  legalLastName: "Legal last name",
  dateOfBirth: "Date of birth",
  relationship: "Relationship",
  nationality: "Nationality",
};

type CompanionView = Pick<CompanionProfile, "legalFirstName" | "legalLastName" | "relationship" | "dateOfBirth" | "nationality" | "isMinor" | "readiness">;

/** A companion's saved details as facts (the name is the page title); null means "not added yet". */
export function getCompanionFacts(companion: CompanionView): ProfileFact[] {
  const born = companion.dateOfBirth ? joined([formatDate(companion.dateOfBirth), companion.isMinor ? "Under 18" : null], " · ") : null;
  return [
    { label: "Relationship", value: joined([companion.relationship], ""), icon: "relationship" },
    { label: "Date of birth", value: born, icon: "birthday" },
    { label: "Nationality", value: companion.nationality.trim() ? countryName(companion.nationality) : null, icon: "nationality" },
  ];
}

/** The line under a companion's name in the list. */
export function companionRowDetail(companion: CompanionView) {
  const missing = companion.readiness.missingFields.length;
  if (!missing) return companion.relationship.trim() || "Ready for check-in";
  return joined([companion.relationship, `${missing} ${missing === 1 ? "detail" : "details"} missing`], " · ")!;
}
