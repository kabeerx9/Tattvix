import { getHotelOnboarding, onboardingStorageKey } from "@tattvix/api";
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Panel, PanelSection } from "@/components/design-system";

import { hotelDetailsQueries } from "@/features/hotel-details/queries";
import { hotelOperationsQueries } from "@/features/hotel-operations/queries";
import { useHotelSubscription } from "@/features/subscription/use-hotel-subscription";

import { OnboardingGuidePage } from "./onboarding-guide";
import { OnboardingPrompt } from "./onboarding-prompt";

type Props = { organizationSlug: string; propertySlug: string; propertyId: number; canManageHotel: boolean; canManageRooms: boolean };

function useHotelGuide({ organizationSlug, propertySlug, canManageHotel, canManageRooms }: Props) {
  const details = useQuery({ ...hotelDetailsQueries.property(organizationSlug, propertySlug), enabled: canManageHotel || canManageRooms, refetchOnMount: "always" });
  const rooms = useQuery({ ...hotelOperationsQueries.rooms(organizationSlug, propertySlug), enabled: canManageRooms, refetchOnMount: "always" });
  const ready = (canManageHotel || canManageRooms) && Boolean(details.data) && (!canManageRooms || Boolean(rooms.data));
  const guide = ready
    ? getHotelOnboarding({
      details: details.data!,
      rooms: rooms.data?.rooms ?? [],
      canManageHotel,
      canManageRooms,
    })
    : null;
  return { guide, isLoading: details.isLoading || rooms.isLoading, isError: details.isError || (canManageRooms && rooms.isError), refetch: () => Promise.all([...(canManageHotel || canManageRooms ? [details.refetch()] : []), ...(canManageRooms ? [rooms.refetch()] : [])]) };
}

export function HotelOnboardingPrompt(props: Props) {
  const { userId } = useAuth();
  const { guide, isError } = useHotelGuide(props);
  const subscription = useHotelSubscription(props.organizationSlug);
  if (!userId || !guide || isError || subscription?.entitled === false) return null;
  return <OnboardingPrompt guide={guide} storageKey={onboardingStorageKey(userId, `property:${props.propertyId}`)} to="/hotel/$organizationSlug/$propertySlug/getting-started" params={props} />;
}

export function HotelOnboardingPage(props: Props) {
  const guide = useHotelGuide(props);
  const subscription = useHotelSubscription(props.organizationSlug);
  if (!props.canManageHotel && !props.canManageRooms) return <div className="mx-auto grid max-w-4xl gap-6"><PageHeader title="Getting started" /><Panel><PanelSection><p className="text-sm text-muted-foreground">Your role does not include property setup. Your owner can prepare this property.</p></PanelSection></Panel></div>;
  return <OnboardingGuidePage guide={guide.guide} scope={props} isLoading={guide.isLoading} isError={guide.isError} onRetry={guide.refetch} readOnly={subscription?.entitled === false} />;
}
