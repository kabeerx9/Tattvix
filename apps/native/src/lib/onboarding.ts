import * as SecureStore from "expo-secure-store";

export { onboardingActionHref, shouldShowOnboardingPrompt, type OnboardingAction } from "./onboarding-paths";

/** Dismissal is intentionally the only persisted onboarding state. */
export function readOnboardingDismissal(key: string): boolean {
  try {
    return SecureStore.getItem(key) === "dismissed";
  } catch {
    return false;
  }
}

export function dismissOnboarding(key: string) {
  try {
    SecureStore.setItem(key, "dismissed");
  } catch {
    // Storage is an optional convenience; guide navigation must still work.
  }
}
