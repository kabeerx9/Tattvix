import { getGuestOnboarding, onboardingStorageKey } from "@tattvix/api";
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";

import { guestProfileQueries } from "@/features/guest-profile/queries";

import { OnboardingGuidePage } from "./onboarding-guide";
import { OnboardingPrompt } from "./onboarding-prompt";

function useGuestGuide() {
  const query = useQuery({ ...guestProfileQueries.detail(), refetchOnMount: "always" });
  return { ...query, guide: query.data ? getGuestOnboarding(query.data) : null };
}

export function GuestOnboardingPrompt() {
  const { userId } = useAuth();
  const { guide, isError } = useGuestGuide();
  if (!userId || isError) return null;
  return <OnboardingPrompt guide={guide} storageKey={onboardingStorageKey(userId, "guest")} to="/getting-started" />;
}

export function GuestOnboardingPage() {
  const query = useGuestGuide();
  return <OnboardingGuidePage guide={query.guide} isLoading={query.isLoading} isError={query.isError} onRetry={() => query.refetch()} />;
}
