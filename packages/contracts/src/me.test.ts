import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { apiErrorResponseSchema, meResponseSchema } from "./me.ts";

describe("meResponseSchema", () => {
  const validMe = {
    id: 1,
    clerkId: "user_123",
    email: "user@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
    username: "ada",
    imageUrl: "https://example.com/avatar.png",
    createdAt: "2026-06-14T12:00:00.000Z",
    updatedAt: "2026-06-14T12:30:00.000Z",
    lastSyncedAt: "2026-06-14T12:31:00.000Z",
    platformRole: null,
    platformPermissions: [],
    memberships: [],
  };

  it("accepts a complete valid response", () => {
    assert.deepEqual(meResponseSchema.parse(validMe), validMe);
  });

  it("accepts empty profile fields", () => {
    const payload = {
      ...validMe,
      email: "",
      firstName: "",
      lastName: "",
      username: "",
      imageUrl: "",
      lastSyncedAt: null,
    };

    assert.deepEqual(meResponseSchema.parse(payload), payload);
  });

  it("rejects missing ids", () => {
    const { id: _id, ...withoutId } = validMe;
    assert.throws(() => meResponseSchema.parse(withoutId));
  });

  it("rejects invalid date strings", () => {
    assert.throws(() =>
      meResponseSchema.parse({
        ...validMe,
        createdAt: "not-a-date",
      }),
    );
  });

  it("accepts scoped hotel membership access", () => {
    const payload = {
      ...validMe,
      memberships: [
        {
          id: 7,
          role: "RECEPTION",
          hasAllProperties: false,
          permissions: ["hotel:view", "rooms:assign", "rooms:view", "stays:update", "stays:view"],
          organization: {
            id: 3,
            name: "Example Hotels",
            slug: "example-hotels",
          },
          properties: [{ id: 4, name: "Jaipur Hotel", slug: "jaipur" }],
        },
      ],
    };

    assert.deepEqual(meResponseSchema.parse(payload), payload);
  });

  it("rejects unknown roles and permissions", () => {
    assert.throws(() =>
      meResponseSchema.parse({
        ...validMe,
        platformRole: "ROOT",
      }),
    );
    assert.throws(() =>
      meResponseSchema.parse({
        ...validMe,
        platformPermissions: ["everything:manage"],
      }),
    );
  });

  it("rejects extra debug fields", () => {
    assert.throws(() =>
      meResponseSchema.parse({
        ...validMe,
        sessionId: "sess_123",
      }),
    );
  });
});

describe("apiErrorResponseSchema", () => {
  it("accepts a string error message", () => {
    assert.deepEqual(apiErrorResponseSchema.parse({ error: "Unauthorized" }), {
      error: "Unauthorized",
    });
  });

  it("rejects an error payload without a string message", () => {
    assert.throws(() => apiErrorResponseSchema.parse({ error: 401 }));
    assert.throws(() => apiErrorResponseSchema.parse({ message: "Unauthorized" }));
  });
});
