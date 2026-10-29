// What a refused Save says beside its button. A form's field errors sit under
// their fields, which may be scrolled out of view in a sheet whose Save is
// pinned to the bottom; this line names the first one, in the form's order, so
// the press never looks like it did nothing.

/** `fields` lists each field's key and label in screen order. Null when nothing is wrong. */
export function formErrorSummary(errors: Record<string, string | undefined>, fields: readonly (readonly [key: string, label: string])[]) {
  const failing = fields.filter(([key]) => errors[key]);
  const first = failing[0];
  if (!first) return null;
  const line = `${first[1]}: ${errors[first[0]]}`;
  return failing.length === 1 ? line : `${failing.length} fields need fixing. ${line}`;
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

export const companionFormFields = [
  ["legalFirstName", "Legal first name"],
  ["legalLastName", "Legal last name"],
  ["dateOfBirth", "Date of birth"],
  ["relationship", "Relationship"],
  ["nationality", "Nationality"],
] as const;

export const documentFormFields = [
  ["documentType", "Document type"],
  ["documentNumber", "Document number"],
  ["nameOnDocument", "Name on document"],
  ["issuingCountry", "Issuing country"],
  ["expiryDate", "Expiry date"],
] as const;
