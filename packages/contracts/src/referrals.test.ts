import assert from "node:assert/strict";
import { test } from "node:test";
import {
  referralCodeSchema,
  optionalReferralCodeSchema,
  referralDashboardSchema,
} from "./referrals";
test("referral codes normalize case and permit an empty optional entry", () => {
  assert.equal(referralCodeSchema.parse(" abcd2345efgh "), "ABCD2345EFGH");
  assert.equal(optionalReferralCodeSchema.parse(" "), undefined);
  assert.equal(optionalReferralCodeSchema.parse(undefined), undefined);
  for (const code of ["BAD", "ABCDEFGHIJKL", "ABCD2345EFGH!"])
    assert.equal(referralCodeSchema.safeParse(code).success, false);
});
test("referral dashboard never accepts applicant private data", () => {
  const value = {
    code: null,
    summary: { total: 0, pending: 0, approved: 0, rejected: 0 },
    registrations: [],
    nextCursor: null,
  };
  assert.deepEqual(referralDashboardSchema.parse(value), value);
  assert.equal(
    referralDashboardSchema.safeParse({
      ...value,
      applicantEmail: "private@example.com",
    }).success,
    false,
  );
});
