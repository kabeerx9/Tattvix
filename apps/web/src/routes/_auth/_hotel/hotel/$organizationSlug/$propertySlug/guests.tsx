import { createFileRoute } from "@tanstack/react-router";

import { HotelGuestsPage } from "@/features/hotel-operations/components/hotel-guests-page";
import { hotelOperationsQueries } from "@/features/hotel-operations/queries";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/guests",
)({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      hotelOperationsQueries.guests(
        params.organizationSlug,
        params.propertySlug,
      ),
    ),
  component: PropertyGuestsRoute,
});

function PropertyGuestsRoute() {
  const params = Route.useParams();
  const { activeProperty } = Route.useRouteContext();
  return (
    <HotelGuestsPage
      organizationSlug={params.organizationSlug}
      propertySlug={params.propertySlug}
      propertyName={activeProperty.name}
    />
  );
}
