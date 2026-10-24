import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Subscription } from "@tattvix/contracts";

import { describeSubscription, getTrialUrgency } from "./status";

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    status: "TRIALING",
    entitled: true,
    trialEndsAt: "2026-12-08T10:00:00Z",
    paidUntil: null,
    entitledUntil: "2026-12-08T10:00:00Z",
    daysLeft: 45,
    ...overrides,
  };
}

const fixedDate = () => "8 Dec";

describe("getTrialUrgency", () => {
  it("escalates as the trial nears its end", () => {
    assert.equal(getTrialUrgency(subscription({ daysLeft: 45 })), "quiet");
    assert.equal(getTrialUrgency(subscription({ daysLeft: 15 })), "quiet");
    assert.equal(getTrialUrgency(subscription({ daysLeft: 14 })), "soon");
    assert.equal(getTrialUrgency(subscription({ daysLeft: 4 })), "soon");
    assert.equal(getTrialUrgency(subscription({ daysLeft: 3 })), "urgent");
    assert.equal(getTrialUrgency(subscription({ daysLeft: 1 })), "urgent");
  });

  it("treats not entitled as expired regardless of daysLeft", () => {
    assert.equal(
      getTrialUrgency(subscription({ entitled: false, status: "EXPIRED", daysLeft: 0 })),
      "expired",
    );
    assert.equal(
      getTrialUrgency(subscription({ entitled: false, status: "MISSING", daysLeft: 0 })),
      "expired",
    );
  });
});

describe("describeSubscription", () => {
  it("says nothing for a paid hotel", () => {
    assert.equal(
      describeSubscription(subscription({ status: "PAID", paidUntil: "2027-01-31T00:00:00Z" }), fixedDate),
      null,
    );
  });

  it("is quiet early in the trial", () => {
    const notice = describeSubscription(subscription({ daysLeft: 45 }), fixedDate);
    assert.equal(notice?.urgency, "quiet");
    assert.equal(notice?.label, "Free trial");
    assert.equal(notice?.message, "45 days left · ends 8 Dec");
  });

  it("counts down in the last two weeks and singularises one day", () => {
    assert.equal(describeSubscription(subscription({ daysLeft: 10 }), fixedDate)?.label, "10 days left");
    const urgent = describeSubscription(subscription({ daysLeft: 1 }), fixedDate);
    assert.equal(urgent?.urgency, "urgent");
    assert.equal(urgent?.label, "Trial ends in 1 day");
    assert.equal(urgent?.message, "Ends 8 Dec. Contact Tattwix to keep going.");
  });

  it("explains what is paused once expired", () => {
    const notice = describeSubscription(
      subscription({ status: "EXPIRED", entitled: false, daysLeft: 0 }),
      fixedDate,
    );
    assert.equal(notice?.urgency, "expired");
    assert.equal(notice?.label, "Trial ended");
    assert.match(notice?.message ?? "", /Check-ins and reports are paused/);
  });

  it("names a missing subscription row distinctly so support can spot it", () => {
    const notice = describeSubscription(
      subscription({ status: "MISSING", entitled: false, daysLeft: 0, trialEndsAt: null, entitledUntil: null }),
      fixedDate,
    );
    assert.equal(notice?.label, "No subscription");
  });
});
