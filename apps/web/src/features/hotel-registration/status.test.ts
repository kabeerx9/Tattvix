import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { HotelRegistrationRequest } from "@tattvix/contracts";

import { getLatestRejectedRequest, hasPendingHotelRequest } from "./status";

const request = (status: HotelRegistrationRequest["status"], submittedAt: string) => ({
  id: 1,
  hotelName: "The Fern",
  address: "1 Green Road",
  contactPhone: "+91 98765 43210",
  status,
  rejectionReason: status === "REJECTED" ? "Please add the legal hotel name." : "",
  submittedAt,
  reviewedAt: null,
  organization: null,
  property: null,
}) satisfies HotelRegistrationRequest;

describe("hotel registration request status", () => {
  it("blocks another submission while any request is pending", () => {
    assert.equal(
      hasPendingHotelRequest([request("REJECTED", "2026-01-01T00:00:00.000Z"), request("PENDING", "2026-01-02T00:00:00.000Z")]),
      true,
    );
  });

  it("prefills from the newest rejected request", () => {
    const latest = getLatestRejectedRequest([
      request("REJECTED", "2026-01-01T00:00:00.000Z"),
      { ...request("REJECTED", "2026-02-01T00:00:00.000Z"), hotelName: "The Fern Jaipur" },
    ]);

    assert.equal(latest?.hotelName, "The Fern Jaipur");
  });

  it("does not offer a correction when a later request was approved", () => {
    const latest = getLatestRejectedRequest([
      request("REJECTED", "2026-01-01T00:00:00.000Z"),
      request("APPROVED", "2026-02-01T00:00:00.000Z"),
    ]);

    assert.equal(latest, undefined);
  });
});
