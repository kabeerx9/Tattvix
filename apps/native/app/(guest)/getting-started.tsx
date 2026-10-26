import { getGuestOnboarding } from "@tattvix/api";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback } from "react";

import { OnboardingGuide } from "@/src/components/onboarding";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { Screen, SecondaryHeader } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import { onboardingActionHref } from "@/src/lib/onboarding-paths";

export default function GuestGettingStartedScreen() {
  const router = useRouter();
  const profile = useQuery(queries.guestProfile.detail());

  useFocusEffect(useCallback(() => { void profile.refetch(); }, [profile.refetch]));

  if (profile.isError || !profile.data) {
    if (profile.isError) return <RetryScreen onRetry={() => void profile.refetch()} retrying={profile.isFetching} />;
    return <PendingScreen />;
  }
  const guide = getGuestOnboarding(profile.data);
  return (
    <Screen refreshing={profile.isFetching && !profile.isPending} onRefresh={() => void profile.refetch()}>
      <SecondaryHeader title="Getting started" onBack={() => router.canGoBack() ? router.back() : router.replace("/(guest)" as Href)} />
      <OnboardingGuide guide={guide} onFinish={() => router.replace("/(guest)" as Href)} onStep={(action) => router.push(onboardingActionHref(action) as Href)} />
    </Screen>
  );
}
