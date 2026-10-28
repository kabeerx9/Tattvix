import assert from "node:assert/strict";
import { test } from "node:test";

import { birthYears, clampDay, daysInMonth, joinDateParts, splitIsoDate } from "./date-parts";

test("splitIsoDate reads stored dates and ignores anything else", () => {
  assert.deepEqual(splitIsoDate("1990-04-07"), { year: 1990, month: 4, day: 7 });
  assert.deepEqual(splitIsoDate(null), { year: null, month: null, day: null });
  assert.deepEqual(splitIsoDate("07/04/1990"), { year: null, month: null, day: null });
});

test("joinDateParts pads and waits for all three parts", () => {
  assert.equal(joinDateParts({ year: 1990, month: 4, day: 7 }), "1990-04-07");
  assert.equal(joinDateParts({ year: 1990, month: null, day: 7 }), null);
});

test("daysInMonth handles leap years and an unknown year", () => {
  assert.equal(daysInMonth(2023, 2), 28);
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(null, 2), 29);
  assert.equal(daysInMonth(2023, 4), 30);
  assert.equal(daysInMonth(2023, null), 31);
});

test("clampDay keeps the day inside the chosen month", () => {
  assert.deepEqual(clampDay({ year: 2023, month: 2, day: 31 }), { year: 2023, month: 2, day: 28 });
  assert.deepEqual(clampDay({ year: null, month: null, day: null }), { year: null, month: null, day: null });
});

test("birthYears runs from this year back 120 years", () => {
  const years = birthYears(new Date(2026, 9, 28));
  assert.equal(years[0], 2026);
  assert.equal(years.at(-1), 1906);
});
