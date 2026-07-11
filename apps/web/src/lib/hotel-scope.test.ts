import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { MeResponse } from "@tattvix/contracts";

import {
  findAccessibleMembership,
  findAccessibleProperty,
  getFirstAccessibleHotelScope,
} from "./hotel-scope";

const currentUser: MeResponse = {
  id: 1,
  clerkId: "user_test",
  email: "owner@example.com",
  firstName: "Hotel",
  lastName: "Owner",
  username: "",
  imageUrl: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  lastSyncedAt: null,
  platformRole: null,
  platformPermissions: [],
  memberships: [
    {
      id: 1,
      role: "OWNER",
      hasAllProperties: true,
      permissions: ["hotel:view", "hotel:manage"],
      organization: { id: 1, name: "My Choice", slug: "my-choice" },
      properties: [
        { id: 1, name: "Kotdwar", slug: "kotdwar" },
      ],
    },
  ],
};

describe("hotel scope resolution", () => {
  it("resolves only organizations available to the current user", () => {
    assert.equal(
      findAccessibleMembership(currentUser, "my-choice")?.organization.id,
      1,
    );
    assert.equal(findAccessibleMembership(currentUser, "another-hotel"), undefined);
  });

  it("resolves only properties exposed by the active membership", () => {
    const membership = currentUser.memberships[0]!;
    assert.equal(findAccessibleProperty(membership, "kotdwar")?.id, 1);
    assert.equal(findAccessibleProperty(membership, "hidden-property"), undefined);
  });

  it("returns the first usable organization and property for legacy redirects", () => {
    const scope = getFirstAccessibleHotelScope(currentUser);
    assert.equal(scope?.membership.organization.slug, "my-choice");
    assert.equal(scope?.property.slug, "kotdwar");
  });
});
