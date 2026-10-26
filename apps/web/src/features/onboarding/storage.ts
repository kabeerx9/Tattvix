const dismissedValue = "dismissed";

/** Device-only preference; storage restrictions must never block the guide. */
export function isOnboardingPromptDismissed(key: string) {
  try {
    return typeof window !== "undefined" && globalThis.localStorage.getItem(key) === dismissedValue;
  } catch {
    return false;
  }
}

export function dismissOnboardingPrompt(key: string) {
  try {
    globalThis.localStorage.setItem(key, dismissedValue);
  } catch {
    // Private browsing and enterprise policies can deny storage. Keep the prompt usable.
  }
}
