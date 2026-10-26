import assert from "node:assert/strict";
import { test } from "node:test";
import { teamAddInputSchema, teamUpdateInputSchema, teamSearchInputSchema } from "./team";

test("team adds require selected user identity and a valid role-specific unique scope", () => {
  assert.equal(teamAddInputSchema.safeParse({ userId: 1, role: "MANAGER", propertyIds: [2] }).success, true);
  assert.equal(teamAddInputSchema.safeParse({ userId: 1, role: "OWNER", propertyIds: [] }).success, true);
  for (const patch of [{ userId: 0 }, { userId: 1.5 }, { userId: undefined, email: "x@example.com" }, { role: "ADMIN" }, { propertyIds: [] }, { propertyIds: [2, 2] }, { propertyIds: [-1] }, { actorId: 1 }]) {
    assert.equal(teamAddInputSchema.safeParse({ userId: 1, role: "MANAGER", propertyIds: [2], ...patch }).success, false);
  }
  assert.equal(teamAddInputSchema.safeParse({ userId: 1, role: "OWNER", propertyIds: [2] }).success, false);
});

test("updates allow activation-only changes but reject empty updates and role changes without scope", () => {
  for (const input of [{ isActive: false }, { role: "OWNER", propertyIds: [] }, { role: "RECEPTION", propertyIds: [3] }, { propertyIds: [2] }]) assert.equal(teamUpdateInputSchema.safeParse(input).success, true);
  for (const input of [{}, { role: "MANAGER" }, { propertyIds: [] }, { role: "OWNER", propertyIds: [2] }, { organizationId: 3 }, { isActive: "false" }]) assert.equal(teamUpdateInputSchema.safeParse(input).success, false);
});

test("email search is trimmed and bounded", () => {
  assert.deepEqual(teamSearchInputSchema.parse({ email: "  USER@  " }), { email: "user@" });
  for (const email of ["ab", "x".repeat(101)]) assert.equal(teamSearchInputSchema.safeParse({ email }).success, false);
});
