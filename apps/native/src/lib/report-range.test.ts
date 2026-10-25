import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { reportRangeFor } from "./report-range";

// Local-time constructors so the expected keys do not depend on the runner's zone.
const today = new Date(2026, 9, 25, 15, 30); // Sun 25 Oct 2026, afternoon

describe("reportRangeFor", () => {
  it("today is a one-day range on the local date", () => {
    assert.deepEqual(reportRangeFor("today", today), { dateFrom: "2026-10-25", dateTo: "2026-10-25" });
  });

  it("yesterday is the single previous local day", () => {
    assert.deepEqual(reportRangeFor("yesterday", today), { dateFrom: "2026-10-24", dateTo: "2026-10-24" });
  });

  it("yesterday crosses a month boundary", () => {
    assert.deepEqual(reportRangeFor("yesterday", new Date(2026, 9, 1, 8)), { dateFrom: "2026-09-30", dateTo: "2026-09-30" });
  });

  it("last 7 days includes today, so it spans seven days", () => {
    assert.deepEqual(reportRangeFor("last7", today), { dateFrom: "2026-10-19", dateTo: "2026-10-25" });
  });

  it("last 30 days includes today, so it spans thirty days", () => {
    assert.deepEqual(reportRangeFor("last30", today), { dateFrom: "2026-09-26", dateTo: "2026-10-25" });
  });

  it("this month starts on the first of the current month", () => {
    assert.deepEqual(reportRangeFor("thisMonth", today), { dateFrom: "2026-10-01", dateTo: "2026-10-25" });
  });

  it("this month on the first day is a single day", () => {
    assert.deepEqual(reportRangeFor("thisMonth", new Date(2026, 9, 1, 0, 5)), { dateFrom: "2026-10-01", dateTo: "2026-10-01" });
  });

  it("crosses a leap-day boundary correctly", () => {
    assert.deepEqual(reportRangeFor("last7", new Date(2028, 2, 3, 12)), { dateFrom: "2028-02-26", dateTo: "2028-03-03" });
  });
});
