import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  platformOrganizationOnboardingInputSchema,
  platformOrganizationOnboardingResponseSchema,
  platformOversightAuditResponseSchema,
  platformOversightStaysResponseSchema,
  platformOversightWeeklyCheckInsQuerySchema,
  platformOversightWeeklyCheckInsResponseSchema,
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

describe("platform oversight contracts", () => {
  it("accepts a stays overview response with only status counts", () => {
    const response = {
      properties: [{
        propertyId: 1,
        propertyName: "Tattvix Jaipur",
        organizationName: "Tattvix Hotels",
        organizationSlug: "tattvix-hotels",
        statusCounts: { pendingCheckIn: 1, checkedIn: 2, checkedOut: 3 },
        totalStays: 6,
      }],
    };
    assert.deepEqual(platformOversightStaysResponseSchema.parse(response), response);
  });

  it("accepts a merged audit feed with both entry kinds", () => {
    const response = {
      entries: [
        {
          kind: "IDENTITY_ACCESS",
          id: "identity-1",
          at: "2024-01-01T00:00:00+00:00",
          actorEmail: "staff@example.com",
          action: "DOCUMENT_VIEWED",
          organizationSlug: "tattvix-hotels",
          propertyName: "Tattvix Jaipur",
          stayId: "12345678-1234-4123-8123-123456789012",
        },
        {
          kind: "PLATFORM",
          id: "platform-1",
          at: "2024-01-01T00:00:01+00:00",
          actorEmail: "admin@example.com",
          action: "MEMBER_ADDED",
          organizationSlug: "tattvix-hotels",
          target: "staff@example.com",
        },
      ],
    };
    assert.deepEqual(platformOversightAuditResponseSchema.parse(response), response);
  });

  it("rejects audit and stays payloads that leak identity document fields", () => {
    const withDocumentNumber = {
      entries: [
        {
          kind: "IDENTITY_ACCESS",
          id: "identity-1",
          at: "2024-01-01T00:00:00+00:00",
          actorEmail: "staff@example.com",
          action: "DOCUMENT_VIEWED",
          organizationSlug: "tattvix-hotels",
          propertyName: "Tattvix Jaipur",
          stayId: "12345678-1234-4123-8123-123456789012",
          documentNumber: "X1234567",
        },
      ],
    };
    assert.throws(() => platformOversightAuditResponseSchema.parse(withDocumentNumber));

    const withObjectKey = {
      properties: [{
        propertyId: 1,
        propertyName: "Tattvix Jaipur",
        organizationName: "Tattvix Hotels",
        organizationSlug: "tattvix-hotels",
        statusCounts: { pendingCheckIn: 1, checkedIn: 2, checkedOut: 3 },
        totalStays: 6,
        objectKey: "leaked/key.jpg",
      }],
    };
    assert.throws(() => platformOversightStaysResponseSchema.parse(withObjectKey));
  });
});

describe("platform oversight weekly check-ins contracts", () => {
  it("accepts a query with a default-able weeks param", () => {
    assert.deepEqual(platformOversightWeeklyCheckInsQuerySchema.parse({}), {});
    assert.deepEqual(platformOversightWeeklyCheckInsQuerySchema.parse({ weeks: "12" }), {
      weeks: 12,
    });
  });

  it("rejects weeks outside the bounded range", () => {
    assert.throws(() => platformOversightWeeklyCheckInsQuerySchema.parse({ weeks: 0 }));
    assert.throws(() => platformOversightWeeklyCheckInsQuerySchema.parse({ weeks: 27 }));
  });

  it("accepts a rows response with no identity fields", () => {
    const response = {
      rows: [
        {
          weekStart: "2026-07-27",
          propertyId: 1,
          propertyName: "Tattvix Jaipur",
          organizationSlug: "tattvix-hotels",
          checkIns: 4,
        },
      ],
    };
    assert.deepEqual(
      platformOversightWeeklyCheckInsResponseSchema.parse(response),
      response,
    );
  });

  it("rejects rows carrying unexpected identity-leaning fields", () => {
    const withGuestName = {
      rows: [
        {
          weekStart: "2026-07-27",
          propertyId: 1,
          propertyName: "Tattvix Jaipur",
          organizationSlug: "tattvix-hotels",
          checkIns: 4,
          guestName: "Kabeer Joshi",
        },
      ],
    };
    assert.throws(() =>
      platformOversightWeeklyCheckInsResponseSchema.parse(withGuestName),
    );
  });
});
