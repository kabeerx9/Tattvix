import { createFileRoute } from "@tanstack/react-router";

import { HotelReportsPage } from "@/features/hotel-reports/components/hotel-reports-page";
import { hotelReportsQueries } from "@/features/hotel-reports/queries";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/reports",
)({
  // Only the in-house list is preloaded: occupancy is gated by the subscription
  // (402 once the trial ends) and the page renders a locked placeholder for it,
  // which a throwing loader would pre-empt with the route error state.
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      hotelReportsQueries.inHouse(params.organizationSlug, params.propertySlug),
    ),
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
