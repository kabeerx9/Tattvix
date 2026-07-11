import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  companionProfileInputSchema,
  companionProfileListResponseSchema,
} from "./companion-profile";

const companion = {
  legalFirstName: "Aarav",
  legalLastName: "Joshi",
  dateOfBirth: "2016-05-14",
  relationship: "Child",
  nationality: "IN",
};

describe("companion profile contracts", () => {
  it("allows an incomplete reusable companion draft", () => {
    const parsed = companionProfileInputSchema.parse({
      legalFirstName: "Aarav",
      legalLastName: "",
      dateOfBirth: null,
      relationship: "",
      nationality: "",
    });

    assert.equal(parsed.legalFirstName, "Aarav");
    assert.equal(parsed.dateOfBirth, null);
  });

  it("normalizes nationality and accepts server-derived readiness", () => {
    const response = companionProfileListResponseSchema.parse({
      companions: [
        {
          id: 1,
          ...companion,
          nationality: "in",
          isMinor: true,
          readiness: { isReady: true, missingFields: [] },
          createdAt: "2026-07-12T00:00:00Z",
          updatedAt: "2026-07-12T00:00:00Z",
        },
      ],
    });

    assert.equal(response.companions[0]?.nationality, "IN");
    assert.equal(response.companions[0]?.isMinor, true);
  });

  it("rejects future dates and malformed country codes", () => {
    assert.equal(
      companionProfileInputSchema.safeParse({
        ...companion,
        dateOfBirth: "2999-01-01",
      }).success,
      false,
    );
    assert.equal(
      companionProfileInputSchema.safeParse({
        ...companion,
        nationality: "IND",
      }).success,
      false,
    );
  });
});
