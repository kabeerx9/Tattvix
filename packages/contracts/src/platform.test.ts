import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  platformOrganizationOnboardingInputSchema,
  platformOrganizationOnboardingResponseSchema,
  platformUserSearchParamsSchema,
  platformUserSearchResponseSchema,
} from "./platform.ts";

describe("platform organization onboarding contracts", () => {
  const input = {
    organization: { name: "Tattvix Hotels", slug: "tattvix-hotels" },
    property: { name: "Tattvix Jaipur", slug: "jaipur" },
    ownerEmail: "owner@example.com",
  };

  it("accepts a valid onboarding request", () => {
    assert.deepEqual(platformOrganizationOnboardingInputSchema.parse(input), input);
  });

  it("rejects invalid slugs and owner emails", () => {
    assert.throws(() =>
      platformOrganizationOnboardingInputSchema.parse({
        ...input,
        organization: { ...input.organization, slug: "Not Valid" },
      }),
    );
    assert.throws(() =>
      platformOrganizationOnboardingInputSchema.parse({
        ...input,
        ownerEmail: "not-an-email",
      }),
    );
  });

  it("accepts the atomic onboarding response", () => {
    const response = {
      organization: { id: 1, ...input.organization },
      property: { id: 2, ...input.property },
      owner: {
        id: 3,
        email: input.ownerEmail,
        firstName: "Hotel",
        lastName: "Owner",
      },
      membership: { id: 4, role: "OWNER", hasAllProperties: true },
    };

    assert.deepEqual(platformOrganizationOnboardingResponseSchema.parse(response), response);
  });
});

describe("platform user search contracts", () => {
  it("accepts a bounded email search and safe user results", () => {
    assert.deepEqual(platformUserSearchParamsSchema.parse({ email: "owner@" }), {
      email: "owner@",
    });
    const response = {
      users: [{
        id: 1,
        email: "owner@example.com",
        firstName: "Hotel",
        lastName: "Owner",
        imageUrl: "",
      }],
    };
    assert.deepEqual(platformUserSearchResponseSchema.parse(response), response);
  });

  it("rejects searches shorter than three characters", () => {
    assert.throws(() => platformUserSearchParamsSchema.parse({ email: "ow" }));
  });
});
