import { createFileRoute } from "@tanstack/react-router";

import { HotelStaysPage } from "@/features/hotel-stays/components/hotel-stays-page";
import { hotelStayQueries } from "@/features/hotel-stays/queries";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/stays/",
)({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      hotelStayQueries.list(params.organizationSlug, params.propertySlug),
    ),
  component: PropertyStaysIndexRoute,
});

function PropertyStaysIndexRoute() {
  const params = Route.useParams();
  const { activeProperty } = Route.useRouteContext();
  return (
    <HotelStaysPage
      organizationSlug={params.organizationSlug}
      propertySlug={params.propertySlug}
      propertyName={activeProperty.name}
    />
  );
}
