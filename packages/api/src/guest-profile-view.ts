// Read view of the guest travel profile, shared by both clients: what each
// section shows, which fields its edit sheet holds, and check-in readiness.
import type { GuestProfileInput, GuestProfileMissingField } from "@tattvix/contracts";

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

export type ProfileFact = { label: string; value: string | null };

const joined = (parts: (string | null | undefined)[], separator: string) => parts.map((part) => part?.trim()).filter(Boolean).join(separator) || null;

/** Label and value pairs per section; a null value means "not added yet". */
export function getProfileSections(profile: GuestProfileInput): { key: ProfileSectionKey; title: string; facts: ProfileFact[] }[] {
  const country = (code: string) => (code.trim() ? countryName(code) : null);
  return [
    {
      key: "personal",
      title: profileSectionTitles.personal,
      facts: [
        { label: "Legal name", value: joined([profile.legalFirstName, profile.legalLastName], " ") },
        { label: "Phone", value: joined([profile.phoneNumber], "") },
        { label: "Date of birth", value: profile.dateOfBirth ? formatDate(profile.dateOfBirth) : null },
        { label: "Nationality", value: country(profile.nationality) },
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
        },
      ],
    },
    {
      key: "emergency",
      title: profileSectionTitles.emergency,
      facts: [{ label: "Contact", value: joined([profile.emergencyContactName, profile.emergencyContactPhone], " · ") }],
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
