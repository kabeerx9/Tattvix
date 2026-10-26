import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { onboardingActionHref, shouldShowOnboardingPrompt } from "./onboarding-paths";

describe("onboardingActionHref", () => {
  it("keeps guest setup actions in personal routes", () => {
    assert.equal(onboardingActionHref("profile"), "/(guest)/profile");
    assert.equal(onboardingActionHref("identity"), "/(guest)/profile?onboarding=identity");
  });

  it("scopes hotel actions to the selected property", () => {
    assert.equal(onboardingActionHref("property", { organizationSlug: "north", propertySlug: "lake" }), "/(hotel)/north/lake/details");
    assert.equal(onboardingActionHref("rooms", { organizationSlug: "north", propertySlug: "lake" }), "/(hotel)/north/lake/rooms");
  });
});

describe("shouldShowOnboardingPrompt", () => {
  it("only shows unfinished guides that have not been dismissed", () => {
    assert.equal(shouldShowOnboardingPrompt({ isComplete: false, dismissed: false }), true);
    assert.equal(shouldShowOnboardingPrompt({ isComplete: true, dismissed: false }), false);
    assert.equal(shouldShowOnboardingPrompt({ isComplete: false, dismissed: true }), false);
  });
});
