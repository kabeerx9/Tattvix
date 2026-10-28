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
