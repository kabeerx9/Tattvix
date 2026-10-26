import { createFileRoute } from "@tanstack/react-router";

import { HotelOnboardingPage } from "@/features/onboarding/components/hotel-onboarding";

export const Route = createFileRoute("/_auth/_hotel/hotel/$organizationSlug/$propertySlug/getting-started")({
  component: HotelGettingStartedRoute,
});

function HotelGettingStartedRoute() {
  const params = Route.useParams();
  const { activeMembership, activeProperty } = Route.useRouteContext();
  return <HotelOnboardingPage {...params} propertyId={activeProperty.id} canManageHotel={activeMembership.permissions.includes("hotel:manage")} canManageRooms={activeMembership.permissions.includes("rooms:manage")} />;
}
