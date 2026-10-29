import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defaultTrialExtension, describeSubscriptionEvent, endOfLocalDay, platformMemberName, platformRoleLabel } from "./platform-organizations";

describe("organization labels", () => {
  it("names a member by their name, else their email", () => {
    const user = { id: 1, email: "a@x.test", firstName: "", lastName: "", imageUrl: "" };
    assert.equal(platformMemberName({ user }), "a@x.test");
    assert.equal(platformMemberName({ user: { ...user, firstName: "Asha", lastName: "Rao" } }), "Asha Rao");
    assert.equal(platformRoleLabel("RECEPTION"), "Reception");
  });

  it("describes a subscription event on one line", () => {
    const event = { id: 1, kind: "TRIAL_EXTENDED" as const, actorEmail: "admin@x.test", previousTrialEndsAt: "2026-12-01T00:00:00Z", newTrialEndsAt: "2026-12-15T00:00:00Z", note: "", createdAt: "2026-11-20T00:00:00Z" };
    const fmt = (iso: string) => iso.slice(0, 10);
    assert.equal(describeSubscriptionEvent(event, fmt), "2026-12-01 → 2026-12-15 · admin@x.test · 2026-11-20");
    assert.equal(describeSubscriptionEvent({ ...event, previousTrialEndsAt: null, actorEmail: null, note: "Late start" }, fmt), "until 2026-12-15 · Late start · 2026-11-20");
  });
});

describe("trial extension", () => {
  it("defaults to two weeks past the current end while entitled, else past today", () => {
    const now = new Date(2026, 9, 29, 10);
    assert.equal(defaultTrialExtension({ entitled: true, trialEndsAt: "2026-12-08T00:00:00Z" }, 14, now).getTime(), new Date("2026-12-22T00:00:00Z").getTime());
    assert.equal(defaultTrialExtension({ entitled: false, trialEndsAt: "2026-09-01T00:00:00Z" }, 14, now).getDate(), 12);
  });

  it("runs the trial to the end of the chosen local day", () => {
    const end = endOfLocalDay(new Date(2026, 11, 22, 9, 30));
    assert.deepEqual([end.getHours(), end.getMinutes(), end.getSeconds(), end.getDate()], [23, 59, 59, 22]);
  });
});
