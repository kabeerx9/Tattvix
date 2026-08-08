import { createFileRoute } from "@tanstack/react-router";

import { HotelReportsPage } from "@/features/hotel-reports/components/hotel-reports-page";
import { hotelReportsQueries } from "@/features/hotel-reports/queries";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/reports",
)({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        hotelReportsQueries.inHouse(params.organizationSlug, params.propertySlug),
      ),
      context.queryClient.ensureQueryData(
        hotelReportsQueries.occupancy(params.organizationSlug, params.propertySlug),
      ),
    ]),
  component: PropertyReportsRoute,
});

function PropertyReportsRoute() {
  const params = Route.useParams();
  const { activeProperty } = Route.useRouteContext();
  return (
    <HotelReportsPage
      organizationSlug={params.organizationSlug}
      propertySlug={params.propertySlug}
      propertyName={activeProperty.name}
    />
  );
}
