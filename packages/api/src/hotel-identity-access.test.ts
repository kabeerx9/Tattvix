import assert from "node:assert/strict";
import { test } from "node:test";

import { describeHotelIdentityAccess } from "./hotel-identity-access";

const format = (iso: string) => `<${iso}>`;
const access = (isActive: boolean, expiresAt: string | null) => ({ isActive, reason: "ACTIVE" as const, expiresAt });

test("before checkout the line names the window, ignoring any legacy deadline", () => {
  for (const operationalStatus of ["PENDING_CHECK_IN", "CHECKED_IN"] as const) {
    for (const expiresAt of [null, "2026-01-01T00:00:00Z"]) {
      assert.equal(describeHotelIdentityAccess({ operationalStatus, identityAccess: access(true, expiresAt) }, { format }), "ID access ends 60 days after checkout");
    }
  }
});

test("after checkout the line names the actual end date", () => {
  assert.equal(
    describeHotelIdentityAccess({ operationalStatus: "CHECKED_OUT", identityAccess: access(true, "2026-12-26T10:00:00Z") }, { format }),
    "ID access ends <2026-12-26T10:00:00Z>",
  );
});

test("a checked-out stay with no stored end date falls back to the window", () => {
  assert.equal(describeHotelIdentityAccess({ operationalStatus: "CHECKED_OUT", identityAccess: access(true, null) }), "ID access ends 60 days after checkout");
});

test("no line once access is no longer active", () => {
  assert.equal(describeHotelIdentityAccess({ operationalStatus: "CHECKED_OUT", identityAccess: access(false, "2026-01-01T00:00:00Z") }), null);
});

test("the default format is a plain date", () => {
  assert.match(describeHotelIdentityAccess({ operationalStatus: "CHECKED_OUT", identityAccess: access(true, "2026-12-26T10:00:00Z") }) ?? "", /^ID access ends 26 Dec 2026$/);
});
