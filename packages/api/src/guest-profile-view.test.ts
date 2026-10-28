import assert from "node:assert/strict";
import { test } from "node:test";
import type { GuestProfileInput } from "@tattvix/contracts";

import { avatarTone } from "./guest-format";
import { companionRowDetail, getCompanionFacts, getProfileReadiness, getProfileSections } from "./guest-profile-view";

const empty: GuestProfileInput = {
  legalFirstName: "", legalLastName: "", phoneNumber: "", dateOfBirth: null, nationality: "",
  addressLine1: "", addressLine2: "", city: "", stateRegion: "", postalCode: "", country: "",
  emergencyContactName: "", emergencyContactPhone: "",
};

test("a filled profile reads as plain facts", () => {
  const [personal, address, emergency] = getProfileSections({
    ...empty, legalFirstName: "Asha", legalLastName: "Nayak", phoneNumber: "+91 98765 43210", dateOfBirth: "1995-01-01", nationality: "IN",
    addressLine1: "12 MG Road", city: "Jaipur", stateRegion: "Rajasthan", postalCode: "302001", country: "IN",
    emergencyContactName: "Ravi Nayak", emergencyContactPhone: "+91 99999 00000",
  });
  assert.deepEqual(personal!.facts.map((fact) => fact.value), ["Asha Nayak", "+91 98765 43210", "1 Jan 1995", "India"]);
  assert.equal(address!.facts[0]!.value, "12 MG Road\nJaipur, Rajasthan 302001\nIndia");
  assert.equal(emergency!.facts[0]!.value, "Ravi Nayak · +91 99999 00000");
});

test("missing values are null so the screen can say they are not added", () => {
  const sections = getProfileSections(empty);
  assert.ok(sections.every((section) => section.facts.every((fact) => fact.value === null)));
});

test("readiness counts what is left", () => {
  assert.deepEqual(getProfileReadiness([]), { ready: true, completed: 11, total: 11, percent: 100, missing: [] });
  const partial = getProfileReadiness(["phoneNumber", "identityDocuments"]);
  assert.deepEqual({ ready: partial.ready, completed: partial.completed, missing: partial.missing }, { ready: false, completed: 9, missing: ["Phone number", "A government ID"] });
});

test("companion facts and list line", () => {
  const companion = {
    legalFirstName: "Ravi", legalLastName: "Nayak", relationship: "Brother", dateOfBirth: "2012-05-04", nationality: "IN", isMinor: true,
    readiness: { isReady: false, missingFields: ["nationality"] },
  } as unknown as Parameters<typeof getCompanionFacts>[0];
  assert.deepEqual(getCompanionFacts(companion).map((fact) => fact.value), ["Brother", "4 May 2012 · Under 18", "India"]);
  assert.equal(companionRowDetail(companion), "Brother · 1 detail missing");
  assert.equal(companionRowDetail({ ...companion, relationship: "", readiness: { isReady: true, missingFields: [] } }), "Ready for check-in");
});

test("avatar tone is stable per name and ignores case and spacing", () => {
  assert.equal(avatarTone("Asha Nayak"), avatarTone(" asha nayak "));
  assert.ok([0, 1, 2, 3, 4].includes(avatarTone("Ravi")));
  assert.notEqual(new Set(["Asha", "Ravi", "Meera", "Kabir", "Neha", "Priya"].map(avatarTone)).size, 1);
});
