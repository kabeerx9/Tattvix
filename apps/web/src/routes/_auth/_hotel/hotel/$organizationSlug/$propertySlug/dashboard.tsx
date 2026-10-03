import { createFileRoute } from "@tanstack/react-router";

import { hotelOverviewQueries } from "@/features/hotel-overview/queries";
import { HotelOverviewPage } from "@/features/hotel-overview/components/hotel-overview-page";
import { hotelOperationsQueries } from "@/features/hotel-operations/queries";
import { hotelStayQueries } from "@/features/hotel-stays/queries";

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
  component: PropertyDashboardRoute,
});

function PropertyDashboardRoute() {
  const params = Route.useParams();
  return (
    <HotelOverviewPage
      organizationSlug={params.organizationSlug}
      propertySlug={params.propertySlug}
    />
  );
}
