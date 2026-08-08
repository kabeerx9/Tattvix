import { createFileRoute } from "@tanstack/react-router";

import { HotelRoomsPage } from "@/features/hotel-operations/components/hotel-rooms-page";
import { hotelOperationsQueries } from "@/features/hotel-operations/queries";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/rooms",
)({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      hotelOperationsQueries.rooms(
        params.organizationSlug,
        params.propertySlug,
      ),
    ),
  component: PropertyRoomsRoute,
});

function PropertyRoomsRoute() {
  const params = Route.useParams();
  const { activeMembership, activeProperty } = Route.useRouteContext();
  return (
    <HotelRoomsPage
      organizationSlug={params.organizationSlug}
      propertySlug={params.propertySlug}
      propertyName={activeProperty.name}
      canManage={activeMembership.permissions.includes("rooms:manage")}
    />
  );
}
