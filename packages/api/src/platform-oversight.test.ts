import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { auditActionLabel, auditKindLabel, auditTarget, buildWeeklyCheckInsGrid } from "./platform-oversight";

describe("audit labels", () => {
  it("names known actions and passes unknown ones through", () => {
    assert.equal(auditActionLabel("MEMBER_ADDED"), "Member added");
    assert.equal(auditActionLabel("SOMETHING_NEW"), "SOMETHING_NEW");
    assert.equal(auditKindLabel("IDENTITY_ACCESS"), "Identity access");
  });

  it("targets the property for identity access and the target for platform actions", () => {
    assert.equal(
      auditTarget({ kind: "IDENTITY_ACCESS", id: "1", at: "2026-10-01T00:00:00+00:00", actorEmail: "a@x", action: "DETAILS_VIEWED", organizationSlug: "org", propertyName: "Jaipur", stayId: "6b1f6a4e-4b4b-4b4b-8b4b-4b4b4b4b4b4b" }),
      "org · Jaipur",
    );
    assert.equal(
      auditTarget({ kind: "PLATFORM", id: "2", at: "2026-10-01T00:00:00+00:00", actorEmail: "a@x", action: "MEMBER_ADDED", organizationSlug: "org", target: "b@x" }),
      "org · b@x",
    );
  });
});

describe("weekly check-ins grid", () => {
  it("fills missing weeks with nothing, totals per property and sorts by name", () => {
    const grid = buildWeeklyCheckInsGrid([
      { weekStart: "2026-10-12", propertyId: 2, propertyName: "Goa", organizationSlug: "o", checkIns: 3 },
      { weekStart: "2026-10-05", propertyId: 1, propertyName: "Agra", organizationSlug: "o", checkIns: 5 },
      { weekStart: "2026-10-12", propertyId: 1, propertyName: "Agra", organizationSlug: "o", checkIns: 1 },
    ]);
    assert.deepEqual(grid.weeks, ["2026-10-05", "2026-10-12"]);
    assert.deepEqual(grid.properties.map((p) => [p.propertyName, p.total, p.byWeek.get("2026-10-05") ?? 0]), [["Agra", 6, 5], ["Goa", 3, 0]]);
    assert.equal(grid.maxCheckIns, 5);
  });
});
