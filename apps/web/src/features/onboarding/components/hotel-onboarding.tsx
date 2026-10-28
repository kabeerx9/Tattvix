import { getHotelOnboarding, onboardingStorageKey, type OnboardingGuide } from "@tattvix/api";
import { Button } from "@tattvix/ui/components/button";
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useState } from "react";
import { PageHeader, Panel, PanelSection } from "@/components/design-system";

import { hotelDetailsQueries } from "@/features/hotel-details/queries";
import { hotelOperationsQueries } from "@/features/hotel-operations/queries";
import { useHotelSubscription } from "@/features/subscription/use-hotel-subscription";

import { dismissOnboardingPrompt, isOnboardingPromptDismissed } from "../storage";
import { OnboardingGuidePage } from "./onboarding-guide";

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
  const storageKey = onboardingStorageKey(userId, `property:${props.propertyId}`);
  return <SetupRow key={storageKey} guide={guide} storageKey={storageKey} params={{ organizationSlug: props.organizationSlug, propertySlug: props.propertySlug }} />;
}

/** The quiet one-line setup nudge that sits under the Today reservations. */
function SetupRow({ guide, storageKey, params }: { guide: OnboardingGuide; storageKey: string; params: { organizationSlug: string; propertySlug: string } }) {
  const [dismissed, setDismissed] = useState(() => isOnboardingPromptDismissed(storageKey));
  if (guide.isComplete || dismissed) return null;
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-card bg-muted/60 pr-1.5 pl-4 text-sm">
      <p className="min-w-0 flex-1 truncate text-muted-foreground">Finish setup · {guide.completedCount} of {guide.totalCount} done</p>
      <Link to="/hotel/$organizationSlug/$propertySlug/getting-started" params={params} className="shrink-0 font-semibold underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">Continue</Link>
      <Button size="icon-sm" variant="ghost" aria-label="Dismiss setup prompt" onClick={() => { dismissOnboardingPrompt(storageKey); setDismissed(true); }}><X /></Button>
    </div>
  );
}

export function HotelOnboardingPage(props: Props) {
  const guide = useHotelGuide(props);
  const subscription = useHotelSubscription(props.organizationSlug);
  if (!props.canManageHotel && !props.canManageRooms) return <div className="mx-auto grid max-w-4xl gap-6"><PageHeader title="Getting started" /><Panel><PanelSection><p className="text-sm text-muted-foreground">Your role does not include property setup. Your owner can prepare this property.</p></PanelSection></Panel></div>;
  return <OnboardingGuidePage guide={guide.guide} scope={props} isLoading={guide.isLoading} isError={guide.isError} onRetry={guide.refetch} readOnly={subscription?.entitled === false} />;
}
