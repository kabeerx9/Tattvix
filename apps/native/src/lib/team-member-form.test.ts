import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "@tattvix/contracts";

import { buildTeamMemberPatch, canSaveTeamMember, isLostTeamAccess, propertiesForRole, propertyScopeLabel } from "./team-member-form";

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

test("team routes refresh access for masked or explicit owner denial", () => {
  assert.equal(isLostTeamAccess(new ApiError(403, "Forbidden")), true);
  assert.equal(isLostTeamAccess(new ApiError(404, "Not found")), true);
  assert.equal(isLostTeamAccess(new ApiError(409, "Last owner")), false);
});

test("property-only team edits never resend a stale role", () => {
  assert.deepEqual(buildTeamMemberPatch({ role: "RECEPTION", propertyIds: [4, 9], roleChanged: false, propertyScopeChanged: true }), { propertyIds: [4, 9] });
});

test("role changes include an explicit scope in the same patch", () => {
  assert.deepEqual(buildTeamMemberPatch({ role: "MANAGER", propertyIds: [4], roleChanged: true, propertyScopeChanged: false }), { role: "MANAGER", propertyIds: [4] });
});
