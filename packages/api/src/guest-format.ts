import type { CompanionProfile, IdentityDocument, IdentityDocumentType } from "@tattvix/contracts";

export const documentTypeLabels: Record<IdentityDocumentType, string> = {
  AADHAAR: "Aadhaar card",
  PASSPORT: "Passport",
  DRIVING_LICENCE: "Driving licence",
  VOTER_ID: "Voter ID",
};

/** "Aadhaar card ending 4821". Only the last four digits are ever shown. */
export function documentLabel(document: Pick<IdentityDocument, "documentType" | "documentNumber">) {
  const type = document.documentType ? documentTypeLabels[document.documentType] : "ID document";
  const ending = document.documentNumber.slice(-4);
  return ending ? `${type} ending ${ending}` : type;
}

export function documentImagesLabel(document: Pick<IdentityDocument, "requirements" | "images">) {
  return document.requirements.backImageRequired || document.images.back.isUploaded
    ? "front and back photos"
    : "photo";
}

export function personName(person: { legalFirstName: string; legalLastName: string }, fallback = "Unnamed") {
  return [person.legalFirstName, person.legalLastName].filter(Boolean).join(" ") || fallback;
}

export function companionSummary(companion: CompanionProfile) {
  return companion.relationship || (companion.readiness.isReady ? "Companion" : "Details needed");
}

export function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${iso}T00:00:00`),
  );
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

/** Which of the five soft avatar tones a person gets: stable per name, the same on web and native. */
export function avatarTone(name: string): 0 | 1 | 2 | 3 | 4 {
  let hash = 0;
  for (const char of name.trim().toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 5) as 0 | 1 | 2 | 3 | 4;
}

export type PlaceTone = "plum" | "midnight" | "emerald" | "graphite";
const placeTones: PlaceTone[] = ["plum", "midnight", "emerald", "graphite"];

/**
 * The colour a hotel wears in the Menu and on Privacy: stable per place, so it
 * looks the same everywhere. Seed with "organizationSlug/propertySlug". Teal is
 * kept for the guest's own Personal place.
 */
export function placeTone(seed: string): PlaceTone {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return placeTones[hash % placeTones.length] ?? "plum";
}

/** Up to two letters for a place's mark: its first two words, skipping words in other scripts when Latin ones exist. */
export function placeInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const latin = words.filter((word) => /^[\p{Script=Latin}\d]/u.test(word));
  const picked = (latin.length ? latin : words).slice(0, 2);
  return picked.map((word) => Array.from(word)[0] ?? "").join("").toUpperCase() || "?";
}
