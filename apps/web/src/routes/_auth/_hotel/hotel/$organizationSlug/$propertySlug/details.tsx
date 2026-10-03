import { createFileRoute } from "@tanstack/react-router";

import { HotelDetailsPage } from "@/features/hotel-details/components/hotel-details-page";
import { hotelDetailsQueries } from "@/features/hotel-details/queries";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/details",
)({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      hotelDetailsQueries.property(
        params.organizationSlug,
        params.propertySlug,
      ),
    ),
  component: PropertyDetailsRoute,
});

function PropertyDetailsRoute() {
  const params = Route.useParams();
  const { activeMembership, activeProperty } = Route.useRouteContext();
  return (
    <HotelDetailsPage
      organizationSlug={params.organizationSlug}
      propertySlug={params.propertySlug}
      propertyName={activeProperty.name}
      canManage={activeMembership.permissions.includes("hotel:manage")}
    />
  );
}
