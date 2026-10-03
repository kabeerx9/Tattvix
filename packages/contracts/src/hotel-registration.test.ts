import assert from "node:assert/strict";
import test from "node:test";

import {
  hotelRegistrationInputSchema,
  hotelRegistrationRequestSchema,
  hotelRegistrationReviewInputSchema,
  platformHotelRegistrationRequestSchema,
} from "./hotel-registration";

const pending = {
  id: 1, hotelName: "Example Hotel", address: "12 Example Road, Jaipur",
  contactPhone: "+919876543210", status: "PENDING", rejectionReason: "",
  submittedAt: "2026-10-03T10:00:00Z", reviewedAt: null,
  organization: null, property: null,
};

test("hotel request trims hotel details and rejects caller-supplied authority", () => {
  assert.equal(hotelRegistrationInputSchema.parse({ hotelName: " Hotel ", address: " Address ", contactPhone: "+919876543210" }).hotelName, "Hotel");
  for (const field of ["ownerEmail", "applicantId", "status"]) {
    assert.equal(hotelRegistrationInputSchema.safeParse({ hotelName: "Hotel", address: "Address", contactPhone: "+919876543210", [field]: "forged" }).success, false);
  }
  assert.equal(hotelRegistrationInputSchema.safeParse({ hotelName: " ", address: "Address", contactPhone: "abc" }).success, false);
});

test("rejection requires a reason and approval does not", () => {
  assert.equal(hotelRegistrationReviewInputSchema.safeParse({ decision: "REJECT" }).success, false);
  assert.equal(hotelRegistrationReviewInputSchema.safeParse({ decision: "REJECT", rejectionReason: " " }).success, false);
  assert.deepEqual(hotelRegistrationReviewInputSchema.parse({ decision: "APPROVE" }), { decision: "APPROVE" });
  assert.equal(hotelRegistrationReviewInputSchema.parse({ decision: "REJECT", rejectionReason: " Incorrect address " }).rejectionReason, "Incorrect address");
});

test("guest request status and admin applicant are explicit", () => {
  assert.equal(hotelRegistrationRequestSchema.parse(pending).status, "PENDING");
  const approved = hotelRegistrationRequestSchema.parse({ ...pending, status: "APPROVED", reviewedAt: "2026-10-03T11:00:00Z", organization: { name: "Example Hotel", slug: "example-hotel-request-1" }, property: { name: "Example Hotel", slug: "hotel" } });
  assert.equal(approved.organization?.slug, "example-hotel-request-1");
  assert.equal(platformHotelRegistrationRequestSchema.parse({ ...pending, applicant: { id: 3, email: "owner@example.com", firstName: "Test", lastName: "Owner" } }).applicant.id, 3);
});

test("contact format matches server validation and approval allows an empty reason", () => {
  const input = { hotelName: "Hotel", address: "Address", contactPhone: "+91 98765-43210" };
  assert.equal(hotelRegistrationInputSchema.safeParse(input).success, true);
  for (const contactPhone of ["+91(98765)43210", "91+9876543210", "++++123456789"]) {
    assert.equal(hotelRegistrationInputSchema.safeParse({ ...input, contactPhone }).success, false);
  }
  assert.equal(hotelRegistrationReviewInputSchema.safeParse({ decision: "APPROVE", rejectionReason: "" }).success, true);
});
