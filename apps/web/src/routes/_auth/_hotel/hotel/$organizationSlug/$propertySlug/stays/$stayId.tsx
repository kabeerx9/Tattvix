import { createFileRoute } from "@tanstack/react-router";

import { HotelStayDetailPage } from "@/features/hotel-stays/components/hotel-stay-detail-page";
import { hotelStayQueries } from "@/features/hotel-stays/queries";
import { hotelOperationsQueries } from "@/features/hotel-operations/queries";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/stays/$stayId",
)({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        hotelStayQueries.detail(
          params.organizationSlug,
          params.propertySlug,
          params.stayId,
        ),
      ),
      context.queryClient.ensureQueryData(
        hotelOperationsQueries.rooms(
          params.organizationSlug,
          params.propertySlug,
        ),
      ),
    ]),
  component: PropertyStayDetailRoute,
});

function PropertyStayDetailRoute() {
  const params = Route.useParams();
  const { activeMembership, activeProperty } = Route.useRouteContext();
  return (
    <HotelStayDetailPage
      organizationSlug={params.organizationSlug}
      propertySlug={params.propertySlug}
      propertyName={activeProperty.name}
      stayId={params.stayId}
      canAssign={activeMembership.permissions.includes("rooms:assign")}
      canCheckout={activeMembership.permissions.includes("stays:update")}
    />
  );
}
