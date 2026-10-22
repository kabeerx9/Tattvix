import assert from "node:assert/strict";
import { test } from "node:test";

import type { GuestProfileInput } from "@tattvix/contracts";

import {
  buildSubmitInput,
  initialStep,
  nextStep,
  resolveStep,
  validateProfileStep,
  type CheckInSelection,
} from "./steps";

const completeProfile: GuestProfileInput = {
  legalFirstName: "Ananya",
  legalLastName: "Sharma",
  phoneNumber: "+91 98201 45673",
  dateOfBirth: "1992-08-14",
  nationality: "IN",
  addressLine1: "702, Sea Breeze Apartments, Bandra West",
  addressLine2: "",
  city: "Mumbai",
  stateRegion: "Maharashtra",
  postalCode: "400050",
  country: "IN",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

test("a returning guest with a ready profile and document skips straight to review", () => {
  assert.equal(initialStep({ missingFields: [], readyDocumentIds: [7] }), "review");
});

test("a new guest starts at the first step with missing fields", () => {
  assert.equal(
    initialStep({ missingFields: ["dateOfBirth", "city", "identityDocuments"], readyDocumentIds: [] }),
    "about",
  );
  assert.equal(
    initialStep({ missingFields: ["city", "identityDocuments"], readyDocumentIds: [] }),
    "address",
  );
  assert.equal(
    initialStep({ missingFields: ["identityDocuments"], readyDocumentIds: [] }),
    "document",
  );
});

test("review and consent cannot be reached while an earlier step is incomplete", () => {
  const base = { missingFields: [], readyDocumentIds: [7], documentId: 7 } as const;
  assert.equal(resolveStep("consent", base), "consent");
  assert.equal(resolveStep("consent", { ...base, missingFields: ["postalCode"] }), "address");
  assert.equal(resolveStep("review", { ...base, missingFields: ["legalLastName"] }), "about");
  // No document chosen (e.g. after a refresh): back to the ID step.
  assert.equal(resolveStep("consent", { ...base, documentId: null }), "document");
  // A chosen document that is not ready does not count.
  assert.equal(resolveStep("review", { ...base, documentId: 9 }), "document");
  // Earlier steps stay reachable for edits.
  assert.equal(resolveStep("about", base), "about");
  assert.equal(resolveStep("companions", { ...base, documentId: null }), "document");
});

test("editing from review returns to review instead of walking every step", () => {
  assert.equal(nextStep("about", true), "review");
  assert.equal(nextStep("about", false), "address");
  assert.equal(nextStep("review", true), "consent");
  assert.equal(nextStep("consent", false), null);
});

test("a step's required fields block continue, other steps' gaps do not", () => {
  const about = validateProfileStep("about", { ...completeProfile, dateOfBirth: null, legalFirstName: " " });
  assert.equal(about.ok, false);
  assert.deepEqual(Object.keys(about.ok ? {} : about.errors).sort(), ["dateOfBirth", "legalFirstName"]);

  // Address is empty, but that belongs to the next step.
  const aboutOnly = validateProfileStep("about", { ...completeProfile, city: "", postalCode: "" });
  assert.equal(aboutOnly.ok, true);

  const address = validateProfileStep("address", { ...completeProfile, country: "India" });
  assert.equal(address.ok, false);
  assert.ok(!address.ok && address.errors.country);
});

test("contract formats are enforced: a future date of birth fails", () => {
  const result = validateProfileStep("about", { ...completeProfile, dateOfBirth: "2999-01-01" });
  assert.equal(result.ok, false);
  assert.ok(!result.ok && result.errors.dateOfBirth);
});

test("a valid step normalises values through the contract schema", () => {
  const result = validateProfileStep("about", { ...completeProfile, nationality: "in", legalFirstName: " Ananya " });
  assert.ok(result.ok);
  assert.equal(result.profile.nationality, "IN");
  assert.equal(result.profile.legalFirstName, "Ananya");
});

const selection: CheckInSelection = {
  documentId: 7,
  readyDocumentIds: [7],
  companionIds: [3, 4],
  companionDocumentIds: { 3: 21 },
  profileReady: true,
  consentAccepted: true,
};

test("nothing can be sent without explicit consent", () => {
  assert.equal(buildSubmitInput({ ...selection, consentAccepted: false }), null);
});

test("nothing can be sent without a ready profile and a ready chosen document", () => {
  assert.equal(buildSubmitInput({ ...selection, profileReady: false }), null);
  assert.equal(buildSubmitInput({ ...selection, documentId: null }), null);
  assert.equal(buildSubmitInput({ ...selection, documentId: 8 }), null);
});

test("the submitted body carries exactly the selected participants and IDs", () => {
  assert.deepEqual(buildSubmitInput(selection), {
    identityDocumentId: 7,
    companionIds: [3, 4],
    companionDocuments: [{ companionId: 3, identityDocumentId: 21 }],
    consentAccepted: true,
  });
});
