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
