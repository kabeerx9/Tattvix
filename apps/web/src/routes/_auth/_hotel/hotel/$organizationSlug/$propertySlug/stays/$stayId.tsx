import { createFileRoute } from "@tanstack/react-router";

import { HotelStayDetailPage } from "@/features/hotel-stays/components/hotel-stay-detail-page";
import { hotelStayQueries } from "@/features/hotel-stays/queries";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/stays/$stayId",
)({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      hotelStayQueries.detail(
        params.organizationSlug,
        params.propertySlug,
        params.stayId,
      ),
    ),
  component: PropertyStayDetailRoute,
});

function PropertyStayDetailRoute() {
  const params = Route.useParams();
  const { activeMembership } = Route.useRouteContext();
  return (
    <HotelStayDetailPage
      organizationSlug={params.organizationSlug}
      propertySlug={params.propertySlug}
      stayId={params.stayId}
      canClose={activeMembership.permissions.includes("stays:update")}
    />
  );
}
