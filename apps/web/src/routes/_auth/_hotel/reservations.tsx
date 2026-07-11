import { createFileRoute, redirect } from "@tanstack/react-router";

import { getFirstAccessibleHotelScope } from "@/lib/hotel-scope";

export const Route = createFileRoute("/_auth/_hotel/reservations")({
  beforeLoad: ({ context }) => {
    const scope = getFirstAccessibleHotelScope(context.auth.currentUser);
    if (!scope) throw redirect({ to: "/hotel" });
    throw redirect({
      to: "/hotel/$organizationSlug/$propertySlug/reservations",
      params: {
        organizationSlug: scope.membership.organization.slug,
        propertySlug: scope.property.slug,
      },
    });
  },
});
