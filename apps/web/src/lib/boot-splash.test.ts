import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSplashHideDelay } from "./boot-splash";

describe("boot splash timing", () => {
  it("waits out the minimum so a fast load doesn't flash the splash", () => {
    assert.equal(getSplashHideDelay(200, 700), 500);
  });
  it("hides immediately once the minimum has passed", () => {
    assert.equal(getSplashHideDelay(700, 700), 0);
    assert.equal(getSplashHideDelay(4000, 700), 0);
  });
});
