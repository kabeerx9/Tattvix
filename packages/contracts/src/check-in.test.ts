import assert from "node:assert/strict";
import test from "node:test";

import {
  checkInContextSchema,
  guestCheckInSubmitInputSchema,
  hotelStayDetailSchema,
} from "./check-in";

const submittedStay = {
  id: "9f04591d-2cc7-4ed0-b84a-f41ca62b0c10",
  status: "SUBMITTED",
  operationalStatus: "PENDING_CHECK_IN",
  room: null,
  submittedAt: "2026-07-18T12:00:00Z",
  closedAt: null,
  checkedInAt: null,
  checkedOutAt: null,
  hotelAccessExpiresAt: "2026-08-17T12:00:00Z",
} as const;

test("check-in context accepts a property and resumable stay", () => {
  const result = checkInContextSchema.safeParse({
    property: {
      id: 1,
      name: "Tattvix Jaipur",
      slug: "jaipur",
      organization: {
        id: 1,
        name: "Tattvix Hotels",
        slug: "tattvix-hotels",
      },
    },
    tokenExpiresAt: "2027-07-18T12:00:00Z",
    accessPolicy: {
      maximumDays: 30,
      postCheckoutGraceHours: 24,
    },
    existingStay: submittedStay,
  });

  assert.equal(result.success, true);
});

test("guest submission requires explicit consent", () => {
  assert.equal(
    guestCheckInSubmitInputSchema.safeParse({
      identityDocumentId: 1,
      companionIds: [],
      consentAccepted: false,
    }).success,
    false,
  );
});

test("hotel detail accepts an active immutable identity snapshot", () => {
  const result = hotelStayDetailSchema.safeParse({
    ...submittedStay,
    guestName: "Kabeer Joshi",
    companionCount: 0,
    identityAccess: {
      isActive: true,
      reason: "ACTIVE",
      expiresAt: "2026-08-17T12:00:00Z",
    },
    snapshot: {
      guest: {
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
      },
      companions: [],
      document: {
        documentType: "AADHAAR",
        documentNumber: "1234-5678-9012",
        nameOnDocument: "Kabeer Joshi",
        issuingCountry: "IN",
        expiryDate: null,
      },
      images: [{ side: "FRONT" }, { side: "BACK" }],
      sharedAt: "2026-07-18T12:00:00Z",
    },
  });

  assert.equal(result.success, true);
});
