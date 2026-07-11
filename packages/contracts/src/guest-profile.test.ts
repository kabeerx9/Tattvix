import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  guestProfileInputSchema,
  guestProfileResponseSchema,
} from "./guest-profile";

const profile = {
  legalFirstName: "Kabeer",
  legalLastName: "Joshi",
  phoneNumber: "+919876543210",
  dateOfBirth: "1995-04-12",
  nationality: "IN",
  addressLine1: "12 Example Road",
  addressLine2: "",
  city: "Kotdwar",
  stateRegion: "Uttarakhand",
  postalCode: "246149",
  country: "IN",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

describe("guest profile contracts", () => {
  it("normalizes country codes while allowing incomplete drafts", () => {
    const parsed = guestProfileInputSchema.parse({
      ...profile,
      nationality: "in",
      country: "",
      dateOfBirth: null,
    });

    assert.equal(parsed.nationality, "IN");
    assert.equal(parsed.country, "");
    assert.equal(parsed.dateOfBirth, null);
  });

  it("accepts server readiness with machine-readable missing fields", () => {
    const response = guestProfileResponseSchema.parse({
      profile,
      readiness: {
        isReady: false,
        missingFields: ["identityDocuments"],
      },
      updatedAt: "2026-07-11T22:42:00Z",
    });

    assert.deepEqual(response.readiness.missingFields, ["identityDocuments"]);
  });

  it("rejects malformed country codes", () => {
    assert.equal(
      guestProfileInputSchema.safeParse({ ...profile, country: "IND" }).success,
      false,
    );
  });

  it("rejects a future date of birth", () => {
    assert.equal(
      guestProfileInputSchema.safeParse({
        ...profile,
        dateOfBirth: "2999-01-01",
      }).success,
      false,
    );
  });
});
