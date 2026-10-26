import assert from "node:assert/strict";
import test from "node:test";

import { dismissOnboardingPrompt, isOnboardingPromptDismissed } from "./storage";

test("keeps prompt dismissal isolated to its supplied scope", () => {
  const values = new Map<string, string>();
  const previous = globalThis.localStorage;
  const previousWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });

  try {
    dismissOnboardingPrompt("tattvix:onboarding:user-a:guest");
    assert.equal(isOnboardingPromptDismissed("tattvix:onboarding:user-a:guest"), true);
    assert.equal(isOnboardingPromptDismissed("tattvix:onboarding:user-a:property:1"), false);
    assert.equal(isOnboardingPromptDismissed("tattvix:onboarding:user-b:guest"), false);
  } finally {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previous });
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
  }
});

test("does not break navigation when browser storage is unavailable", () => {
  const previous = globalThis.localStorage;
  const previousWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
    },
  });

  try {
    assert.equal(isOnboardingPromptDismissed("key"), false);
    assert.doesNotThrow(() => dismissOnboardingPrompt("key"));
  } finally {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previous });
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
  }
});
