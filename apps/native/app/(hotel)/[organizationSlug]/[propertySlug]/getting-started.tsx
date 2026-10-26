import { getHotelOnboarding } from "@tattvix/api";
import { useQueries } from "@tanstack/react-query";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { CircleDashed } from "lucide-react-native";
import { useCallback } from "react";

import { OnboardingGuide } from "@/src/components/onboarding";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { EmptyState, Screen, SecondaryHeader } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import { onboardingActionHref } from "@/src/lib/onboarding-paths";
import { useHotelPlace } from "@/src/lib/hotel-place";
import { isReadOnly } from "@/src/lib/workspace";

export default function HotelGettingStartedScreen() {
  const router = useRouter();
  const place = useHotelPlace();
  const canManageHotel = place.permissions.includes("hotel:manage");
  const canManageRooms = place.permissions.includes("rooms:manage");
  const eligible = canManageHotel || canManageRooms;
  const [details, rooms] = useQueries({
    queries: [
      { ...queries.hotelDetails.property(place.organizationSlug, place.propertySlug), enabled: eligible },
      { ...queries.hotelOperations.rooms(place.organizationSlug, place.propertySlug), enabled: canManageRooms },
    ],
  });
  const refetch = useCallback(() => {
    if (!eligible) return;
    void details.refetch();
    if (canManageRooms) void rooms.refetch();
  }, [details.refetch, eligible, canManageRooms, rooms.refetch]);
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const base = `/(hotel)/${place.organizationSlug}/${place.propertySlug}`;
  if (!eligible) {
    return (
      <Screen>
        <SecondaryHeader title="Getting started" onBack={() => router.canGoBack() ? router.back() : router.replace(base as Href)} />
        <EmptyState icon={CircleDashed} text="Your role does not include property or room setup." />
      </Screen>
    );
  }

  if (details.isError || (canManageRooms && rooms.isError) || !details.data || (canManageRooms && !rooms.data)) {
    if (details.isError || (canManageRooms && rooms.isError)) return <RetryScreen onRetry={refetch} retrying={details.isFetching || rooms.isFetching} />;
    return <PendingScreen />;
  }
  const guide = getHotelOnboarding({ details: details.data, rooms: rooms.data?.rooms ?? [], canManageHotel, canManageRooms });

  return (
    <Screen refreshing={!details.isPending && (details.isFetching || (canManageRooms && rooms.isFetching))} onRefresh={refetch}>
      <SecondaryHeader title="Getting started" onBack={() => router.canGoBack() ? router.back() : router.replace(base as Href)} />
      {guide ? <OnboardingGuide guide={guide} readOnly={isReadOnly(place)} onFinish={() => router.replace(base as Href)} onStep={(action) => router.push(onboardingActionHref(action, place) as Href)} /> : <EmptyState icon={CircleDashed} text="Your role does not include property setup." />}
    </Screen>
  );
}
