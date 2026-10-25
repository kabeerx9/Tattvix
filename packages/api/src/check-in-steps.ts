// Step routing and gating for the guest QR check-in. Pure functions so the
// rules (which step a guest lands on, what blocks Continue, when sending is
// allowed) are tested without rendering.

import {
  guestProfileInputSchema,
  type GuestCheckInSubmitInput,
  type GuestProfileInput,
  type GuestProfileMissingField,
} from "@tattvix/contracts";

export const checkInSteps = [
  "about",
  "address",
  "document",
  "companions",
  "review",
  "consent",
] as const;

export type CheckInStep = (typeof checkInSteps)[number];

export function isCheckInStep(value: unknown): value is CheckInStep {
  return checkInSteps.includes(value as CheckInStep);
}

/** Profile fields each form step owns. Server readiness decides "ready". */
export const stepProfileFields = {
  about: ["legalFirstName", "legalLastName", "phoneNumber", "dateOfBirth", "nationality"],
  address: ["addressLine1", "city", "stateRegion", "postalCode", "country"],
} as const satisfies Record<"about" | "address", readonly GuestProfileMissingField[]>;

export type ProfileStep = keyof typeof stepProfileFields;

type Progress = {
  /** Server-computed missing fields for the primary guest. */
  missingFields: readonly GuestProfileMissingField[];
  /** Ids of the guest's documents the server reports as ready. */
  readyDocumentIds: readonly number[];
  /** The document chosen for this stay, if any. */
  documentId: number | null;
};

function profileStepComplete(step: ProfileStep, missing: readonly GuestProfileMissingField[]) {
  return !stepProfileFields[step].some((field) => missing.includes(field));
}

function documentChosen(progress: Progress) {
  return progress.documentId !== null && progress.readyDocumentIds.includes(progress.documentId);
}

/**
 * Where "Start check-in" lands. A returning guest (complete profile and a
 * ready document) skips the forms and goes straight to Review.
 */
export function initialStep(progress: Omit<Progress, "documentId">): CheckInStep {
  if (!profileStepComplete("about", progress.missingFields)) return "about";
  if (!profileStepComplete("address", progress.missingFields)) return "address";
  if (progress.readyDocumentIds.length === 0) return "document";
  return "review";
}

/**
 * The step actually shown for a requested one. Review and Consent are only
 * reachable once everything before them is complete, so a deep link or a
 * refresh can never show a consent screen for an incomplete check-in.
 */
export function resolveStep(requested: CheckInStep, progress: Progress): CheckInStep {
  const index = checkInSteps.indexOf(requested);
  const blockers: [CheckInStep, boolean][] = [
    ["about", profileStepComplete("about", progress.missingFields)],
    ["address", profileStepComplete("address", progress.missingFields)],
    ["document", documentChosen(progress)],
  ];
  for (const [step, complete] of blockers) {
    if (checkInSteps.indexOf(step) < index && !complete) return step;
  }
  return requested;
}

export function nextStep(step: CheckInStep, returnToReview: boolean): CheckInStep | null {
  if (returnToReview && step !== "review" && step !== "consent") return "review";
  return checkInSteps[checkInSteps.indexOf(step) + 1] ?? null;
}

export function stepNumber(step: CheckInStep) {
  return checkInSteps.indexOf(step) + 1;
}

export type ProfileFieldErrors = Partial<Record<keyof GuestProfileInput, string>>;

const requiredMessages: Record<(typeof stepProfileFields)[ProfileStep][number], string> = {
  legalFirstName: "Enter your first name as it appears on your ID",
  legalLastName: "Enter your last name. For a single name, repeat it here",
  phoneNumber: "Enter your phone number",
  dateOfBirth: "Enter your date of birth",
  nationality: "Choose your nationality",
  addressLine1: "Enter your house, street and area",
  city: "Enter your city",
  stateRegion: "Enter your state or region",
  postalCode: "Enter your PIN or postal code",
  country: "Choose your country",
};

/**
 * Validates one form step before Continue. Uses the shared contract schema
 * for formats (country codes, a past date of birth) and requires every field
 * the step owns, because the server only reports readiness after a save.
 */
export function validateProfileStep(
  step: ProfileStep,
  values: GuestProfileInput,
): { ok: true; profile: GuestProfileInput } | { ok: false; errors: ProfileFieldErrors } {
  const errors: ProfileFieldErrors = {};
  const parsed = guestProfileInputSchema.safeParse(values);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof GuestProfileInput;
      errors[field] ??= issue.message;
    }
  }
  for (const field of stepProfileFields[step]) {
    const value = values[field];
    if (value === null || (typeof value === "string" && !value.trim())) {
      errors[field] ??= requiredMessages[field];
    }
  }
  // Only this step's fields block Continue (address line 2 is optional but
  // shown on the address step, so its format still counts there).
  const owned: readonly string[] = [
    ...stepProfileFields[step],
    ...(step === "address" ? ["addressLine2"] : []),
  ];
  const stepErrors = Object.fromEntries(
    Object.entries(errors).filter(([field]) => owned.includes(field)),
  ) as ProfileFieldErrors;
  if (Object.keys(stepErrors).length) return { ok: false, errors: stepErrors };
  return { ok: true, profile: parsed.success ? parsed.data : values };
}

export type CheckInSelection = {
  documentId: number | null;
  readyDocumentIds: readonly number[];
  companionIds: readonly number[];
  /** Companion id → chosen ready document id. Absent means "no ID shared". */
  companionDocumentIds: Readonly<Record<number, number>>;
  profileReady: boolean;
  consentAccepted: boolean;
};

/**
 * The request body for "Send check-in request", or null when sending is not
 * allowed. Consent must be explicitly accepted: there is no path that sends
 * without it.
 */
export function buildSubmitInput(selection: CheckInSelection): GuestCheckInSubmitInput | null {
  if (!selection.consentAccepted) return null;
  if (!selection.profileReady) return null;
  if (selection.documentId === null || !selection.readyDocumentIds.includes(selection.documentId)) {
    return null;
  }
  return {
    identityDocumentId: selection.documentId,
    companionIds: [...selection.companionIds],
    companionDocuments: selection.companionIds.flatMap((companionId) => {
      const identityDocumentId = selection.companionDocumentIds[companionId];
      return identityDocumentId ? [{ companionId, identityDocumentId }] : [];
    }),
    consentAccepted: true,
  };
}
