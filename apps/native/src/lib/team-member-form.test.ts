import assert from "node:assert/strict";
import test from "node:test";

import { canSaveTeamMember, propertiesForRole, propertyScopeLabel } from "./team-member-form";

test("owners always submit an empty property scope", () => {
  assert.deepEqual(propertiesForRole("OWNER", [4, 9]), []);
  assert.equal(canSaveTeamMember("OWNER", [4], true), true);
});

test("staff require an explicit selected property", () => {
  assert.equal(canSaveTeamMember("MANAGER", [], true), false);
  assert.equal(canSaveTeamMember("RECEPTION", [4], true), true);
});

test("adding a member requires an explicitly selected user", () => {
  assert.equal(canSaveTeamMember("MANAGER", [4], false), false);
});

test("legacy restricted owners keep their displayed selected-property scope", () => {
  assert.equal(propertyScopeLabel({ role: "OWNER", hasAllProperties: false, propertyIds: [4] }, new Map([[4, "Main hotel"]])), "Main hotel");
});
