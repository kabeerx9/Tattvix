import type { OnboardingAction } from "@tattvix/api";

export type { OnboardingAction } from "@tattvix/api";

type HotelScope = { organizationSlug: string; propertySlug: string };

/** Resolve shared guide actions into existing native forms. */
export function onboardingActionHref(action: OnboardingAction, scope?: HotelScope): string {
  if (action === "profile") return "/(guest)/profile";
  if (action === "identity") return "/(guest)/profile?onboarding=identity";
  if (!scope) throw new Error("Hotel onboarding actions require a property scope.");
  const base = `/(hotel)/${scope.organizationSlug}/${scope.propertySlug}`;
  return action === "property" ? `${base}/details` : `${base}/rooms`;
}

export function shouldShowOnboardingPrompt({ isComplete, dismissed }: { isComplete: boolean; dismissed: boolean }) {
  return !isComplete && !dismissed;
}
