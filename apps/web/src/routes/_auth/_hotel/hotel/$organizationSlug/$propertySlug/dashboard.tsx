import { createFileRoute } from "@tanstack/react-router";

import {
  HotelTodayPage,
  HotelTodaySkeleton,
} from "@/features/hotel-overview/components/hotel-today-page";
import { hotelOverviewQueries } from "@/features/hotel-overview/queries";
import { hotelOperationsQueries } from "@/features/hotel-operations/queries";
import { hotelStayQueries } from "@/features/hotel-stays/queries";
import { HotelOnboardingPrompt } from "@/features/onboarding/components/hotel-onboarding";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/dashboard",
)({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        hotelOverviewQueries.summary(params.organizationSlug, params.propertySlug),
      ),
      context.queryClient.ensureQueryData(
        hotelStayQueries.list(params.organizationSlug, params.propertySlug),
      ),
      context.queryClient.ensureQueryData(
        hotelOperationsQueries.rooms(params.organizationSlug, params.propertySlug),
      ),
    ]),
  pendingComponent: HotelTodaySkeleton,
  component: PropertyDashboardRoute,
});

function PropertyDashboardRoute() {
  const params = Route.useParams();
  const { activeMembership, activeProperty, auth } = Route.useRouteContext();
  const permissions = activeMembership.permissions;
  return (
    <div className="grid gap-6">
      <HotelOnboardingPrompt
        organizationSlug={params.organizationSlug}
        propertySlug={params.propertySlug}
        propertyId={activeProperty.id}
        canManageHotel={permissions.includes("hotel:manage")}
        canManageRooms={permissions.includes("rooms:manage")}
      />
      <HotelTodayPage
      organizationSlug={params.organizationSlug}
      propertySlug={params.propertySlug}
      propertyName={activeProperty.name}
      firstName={auth.currentUser?.firstName}
      canAssign={permissions.includes("rooms:assign")}
      canCheckout={permissions.includes("stays:update")}
      canManageRooms={permissions.includes("rooms:manage")}
      />
    </div>
  );
}
