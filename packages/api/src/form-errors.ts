import { ApiError } from "@tattvix/contracts";

// What a refused Save says beside its button. A form's field errors sit under
// their fields, which may be scrolled out of view in a sheet whose Save is
// pinned to the bottom; this line names the first one, in the form's order, so
// the press never looks like it did nothing.

/** `fields` lists each field's key and label in screen order. Null when nothing is wrong. */
export function formErrorSummary(errors: Record<string, string | undefined>, fields: FormFieldList) {
  const failing = fields.map(fieldEntry).filter(([key]) => errors[key]);
  const first = failing[0];
  if (!first) return null;
  const line = `${first[1]}: ${errors[first[0]]}`;
  return failing.length === 1 ? line : `${failing.length} fields need fixing. ${line}`;
}

/** A bare key labels itself ("roomNumber" -> "Room number") so forms without a label table still get a line. */
function fieldEntry(field: string | readonly [key: string, label: string]): readonly [string, string] {
  return typeof field === "string" ? [field, humanizeKey(field)] : field;
}

// Each sheet's fields in screen order, with the labels both apps show.
export const profileFormFields = [
  ["legalFirstName", "Legal first name"],
  ["legalLastName", "Legal last name"],
  ["phoneNumber", "Phone number"],
  ["dateOfBirth", "Date of birth"],
  ["nationality", "Nationality"],
  ["addressLine1", "Address line 1"],
  ["addressLine2", "Address line 2"],
  ["city", "City"],
  ["stateRegion", "State or region"],
  ["postalCode", "Postal code"],
  ["country", "Country"],
  ["emergencyContactName", "Contact name"],
  ["emergencyContactPhone", "Contact phone"],
] as const;

export const hotelRegistrationFormFields = [
  ["hotelName", "Hotel name"],
  ["address", "Hotel address"],
  ["contactPhone", "Contact phone"],
  ["referralCode", "Referral code"],
] as const;

// Keyed by the onboarding payload's own paths, which both apps' zod issues
// already use. The server collapses a nested serializer's errors to the
// parent key ("organization"), so those land in `unmatched` and the summary.
export const onboardingFormFields = [
  ["organization.name", "Organization name"],
  ["organization.slug", "Organization slug"],
  ["property.name", "Property name"],
  ["property.slug", "Property slug"],
  ["ownerEmail", "Owner account"],
] as const;

export const companionFormFields = [
  ["legalFirstName", "Legal first name"],
  ["legalLastName", "Legal last name"],
  ["dateOfBirth", "Date of birth"],
  ["relationship", "Relationship"],
  ["nationality", "Nationality"],
] as const;

// Property settings: the name has its own endpoint but shares the one Save.
export const hotelDetailsFormFields = [
  ["name", "Property name"],
  ["address", "Address"],
  ["contactPhone", "Contact phone"],
  ["description", "Description"],
  ["checkInTime", "Check-in time"],
  ["checkOutTime", "Check-out time"],
  ["amenities", "Amenities"],
] as const;

// Add room, and the rate editor (which only ever sends nightlyRateMinor).
export const roomFormFields = [
  ["number", "Room number"],
  ["floor", "Floor"],
  ["roomType", "Room type"],
  ["nightlyRateMinor", "Nightly rate (INR)"],
] as const;

export const teamMemberFormFields = [
  ["userId", "Search by email"],
  ["role", "Role"],
  ["propertyIds", "Property access"],
] as const;

export const documentFormFields = [
  ["documentType", "Document type"],
  ["documentNumber", "Document number"],
  ["nameOnDocument", "Name on document"],
  ["issuingCountry", "Issuing country"],
  ["expiryDate", "Expiry date"],
] as const;

export const propertyFormFields = [
  ["name", "Property name"],
  ["slug", "Property slug"],
] as const;

export const memberFormFields = [
  ["email", "Account"],
  ["role", "Role"],
] as const;

export const trialExtensionFormFields = [
  ["trialEndsAt", "New trial end"],
  ["note", "Reason"],
] as const;

// Keyed by the charge input's own names (`unitPriceMinor`, not the typed
// rupee string) so the server's keys match without a map.
export const stayChargeFormFields = [
  ["description", "Description"],
  ["quantity", "Quantity"],
  ["unitPriceMinor", "Unit price (INR)"],
] as const;

// The server refuses a save as `{error, code: "invalid", fields}` with its own
// snake_case serializer keys, possibly nested ("companions.0.name"). Each
// form shows errors under its camelCase inputs, so this converts the server's
// keys to the form's: an explicit map entry wins, otherwise every segment is
// case-converted. Keys the form has no input for come back as `unmatched`
// with a `summary` line, so a refusal never vanishes.

export type FormFieldList = readonly (string | readonly [key: string, label: string])[];

export interface ServerFieldErrors {
  /** Messages keyed by the form's own field keys, ready to merge into its errors state. */
  fieldErrors: Record<string, string>;
  /** Messages for server keys the form has no input for, keyed by the server's key. */
  unmatched: Record<string, string>;
  /** One line naming the unmatched fields, for beside Save; null when every key matched. */
  summary: string | null;
}

const EMPTY: ServerFieldErrors = { fieldErrors: {}, unmatched: {}, summary: null };

export function serverFieldErrors(error: unknown, fields: FormFieldList, map: Record<string, string> = {}): ServerFieldErrors {
  if (!isApiError(error) || !error.fields) return EMPTY;
  const entries = Object.entries(error.fields);
  if (entries.length === 0) return EMPTY;
  const known = new Set(fields.map((field) => (typeof field === "string" ? field : field[0])));
  const fieldErrors: Record<string, string> = {};
  const unmatched: Record<string, string> = {};
  for (const [serverKey, message] of entries) {
    if (!message) continue;
    const clientKey = map[serverKey] ?? camelKey(serverKey);
    if (known.has(clientKey)) fieldErrors[clientKey] ??= message;
    else unmatched[serverKey] = message;
  }
  const first = Object.entries(unmatched)[0];
  const count = Object.keys(unmatched).length;
  const line = first ? `${humanizeKey(first[0])}: ${first[1]}` : null;
  const summary = line && count > 1 ? `${count} fields need fixing. ${line}` : line;
  return { fieldErrors, unmatched, summary };
}

/** "front_image" -> "frontImage"; "companions.0.first_name" -> "companions.0.firstName". */
export function camelKey(key: string) {
  return key
    .split(".")
    .map((segment) => segment.replace(/_+([a-z0-9])/g, (_, c: string) => c.toUpperCase()))
    .join(".");
}

/** "room_number" -> "Room number"; "companions.0.first_name" -> "Companions 1 first name". */
function humanizeKey(key: string) {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .split(/[._]+/)
    .filter(Boolean)
    .map((part) => (/^\d+$/.test(part) ? String(Number(part) + 1) : part.toLowerCase()));
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The line beside Save after a mutation error: unmatched server fields first
 * (nowhere else shows them), then the first field error in screen order, then
 * the server's own message, then `fallback` for a non-API failure.
 * Null when there is no error.
 */
export function saveRefusalSummary(error: unknown, errors: Record<string, string | undefined>, fields: FormFieldList, fallback: string) {
  if (!error) return formErrorSummary(errors, fields);
  const refused = serverFieldErrors(error, fields);
  if (refused.summary) return refused.summary;
  const line = formErrorSummary(errors, fields);
  if (line) return line;
  return isApiError(error) ? error.message : fallback;
}

// By name as well as by class: an app may bundle its own copy of contracts.
function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError || (error instanceof Error && error.name === "ApiError");
}
