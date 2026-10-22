import type {
  IdentityDocument,
  IdentityDocumentImageSide,
  IdentityDocumentMissingField,
  IdentityDocumentType,
} from "@tattvix/contracts";

export const documentTypes: IdentityDocumentType[] = [
  "AADHAAR",
  "PASSPORT",
  "DRIVING_LICENCE",
  "VOTER_ID",
];

export const documentTypeLabels: Record<IdentityDocumentType, string> = {
  AADHAAR: "Aadhaar",
  PASSPORT: "Passport",
  DRIVING_LICENCE: "Driving licence",
  VOTER_ID: "Voter ID",
};

export const missingFieldLabels: Record<IdentityDocumentMissingField, string> = {
  documentType: "Document type",
  documentNumber: "Document number",
  nameOnDocument: "Name on document",
  issuingCountry: "Issuing country",
  expiryDate: "Valid expiry date",
  frontImage: "Front photo",
  backImage: "Back photo",
};

export type DocumentRequirements = {
  expiryDateRequired: boolean;
  backImageRequired: boolean;
};

/**
 * Mirrors the server's per-type rules (apps/server/api/identity_documents.py).
 * The server stays the source of truth for readiness; this only decides which
 * fields and photo slots the editor asks for before a save round-trip.
 */
export const documentRequirements: Record<IdentityDocumentType, DocumentRequirements> = {
  AADHAAR: { expiryDateRequired: false, backImageRequired: true },
  PASSPORT: { expiryDateRequired: true, backImageRequired: false },
  DRIVING_LICENCE: { expiryDateRequired: true, backImageRequired: true },
  VOTER_ID: { expiryDateRequired: false, backImageRequired: true },
};

export function requirementsFor(
  type: IdentityDocumentType | "",
): DocumentRequirements {
  return type
    ? documentRequirements[type]
    : { expiryDateRequired: false, backImageRequired: false };
}

/** What the type picker says each document needs. */
export function documentTypeHint(type: IdentityDocumentType): string {
  const { expiryDateRequired, backImageRequired } = documentRequirements[type];
  const photos = backImageRequired ? "Front and back photos" : "Photo page";
  return expiryDateRequired ? `${photos} · expiry date` : photos;
}

/**
 * Photo slots to show. A back photo that was uploaded under an earlier type
 * stays visible so the guest can still see or replace it.
 */
export function photoSlots(
  type: IdentityDocumentType | "",
  backAlreadyUploaded = false,
): IdentityDocumentImageSide[] {
  return requirementsFor(type).backImageRequired || backAlreadyUploaded
    ? ["FRONT", "BACK"]
    : ["FRONT"];
}

export function sideLabel(side: IdentityDocumentImageSide, type: IdentityDocumentType | ""): string {
  if (side === "BACK") return "Back";
  return type === "PASSPORT" ? "Photo page" : "Front";
}

/** Whether the expiry field is shown: required for the type, or already set. */
export function showsExpiry(type: IdentityDocumentType | "", currentExpiry: string | null | undefined): boolean {
  return requirementsFor(type).expiryDateRequired || Boolean(currentExpiry);
}

type NumberFieldProps = {
  inputMode: "numeric" | "text";
  autoCapitalize: "none" | "characters";
  placeholder: string;
  maxLength: number;
};

/** Keyboard and format hints for the document number per type. */
export function documentNumberFieldProps(type: IdentityDocumentType | ""): NumberFieldProps {
  switch (type) {
    case "AADHAAR":
      // 12 digits; allow the spaces people copy from the card.
      return { inputMode: "numeric", autoCapitalize: "none", placeholder: "1234 5678 9012", maxLength: 14 };
    case "PASSPORT":
      return { inputMode: "text", autoCapitalize: "characters", placeholder: "Z1234567", maxLength: 64 };
    case "DRIVING_LICENCE":
      return { inputMode: "text", autoCapitalize: "characters", placeholder: "MH12 20110012345", maxLength: 64 };
    case "VOTER_ID":
      return { inputMode: "text", autoCapitalize: "characters", placeholder: "ABC1234567", maxLength: 64 };
    default:
      return { inputMode: "text", autoCapitalize: "characters", placeholder: "", maxLength: 64 };
  }
}

/**
 * Only the last four characters are ever shown for a saved document. The full
 * number (Aadhaar especially) is never rendered once saved.
 */
export function maskDocumentNumber(value: string): string {
  if (!value) return "Number not added";
  return `•••• ${value.slice(-4)}`;
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const UPLOADABLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Server limits for a prepared (compressed) photo: JPEG/PNG/WebP, 8 MB. */
export function validateUploadFile(file: { type: string; size: number }): string | null {
  if (!UPLOADABLE_TYPES.has(file.type)) return "Use a JPEG, PNG, or WebP image.";
  if (file.size > MAX_UPLOAD_BYTES) return "Image must be 8 MB or smaller.";
  return null;
}

export const EXPIRING_SOON_DAYS = 30;

export type ExpiryStatus =
  | { kind: "none" }
  | { kind: "valid"; label: string }
  | { kind: "expiring"; label: string; days: number }
  | { kind: "expired"; label: string };

/** Today's date as YYYY-MM-DD in the device's time zone. */
export function localIsoDate(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.UTC(...isoParts(fromIso));
  const to = Date.UTC(...isoParts(toIso));
  return Math.round((to - from) / 86_400_000);
}

function isoParts(value: string): [number, number, number] {
  const [year, month, day] = value.split("-").map(Number);
  return [year!, month! - 1, day!];
}

export function formatIsoDate(value: string): string {
  const [year, month, day] = isoParts(value);
  return new Date(Date.UTC(year, month, day)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Matches the server: a document expiring today already counts as expired
 * (`expiry_date <= date.today()`), so it can't be used for a stay.
 */
export function getExpiryStatus(expiryDate: string | null, today = localIsoDate()): ExpiryStatus {
  if (!expiryDate) return { kind: "none" };
  const days = daysBetween(today, expiryDate);
  if (days <= 0) return { kind: "expired", label: `Expired ${formatIsoDate(expiryDate)}` };
  if (days <= EXPIRING_SOON_DAYS) {
    return {
      kind: "expiring",
      days,
      label: days === 1 ? "Expires tomorrow" : `Expires in ${days} days`,
    };
  }
  return { kind: "valid", label: `Valid until ${formatIsoDate(expiryDate)}` };
}

export type DocumentSummary = {
  tone: "success" | "warning" | "danger" | "neutral";
  label: string;
};

/** The one status a document card leads with. Expiry outranks readiness. */
export function summarizeDocument(document: IdentityDocument, today = localIsoDate()): DocumentSummary {
  const expiry = getExpiryStatus(document.expiryDate, today);
  if (expiry.kind === "expired") return { tone: "danger", label: "Expired" };
  const missing = document.readiness.missingFields.length;
  if (!document.readiness.isReady) {
    return {
      tone: "neutral",
      label: `${missing || 1} item${missing === 1 ? "" : "s"} needed`,
    };
  }
  if (expiry.kind === "expiring") return { tone: "warning", label: expiry.label };
  return { tone: "success", label: "Ready" };
}
