import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { findAccessibleProperty } from "@/lib/hotel-scope";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug",
)({
  beforeLoad: ({ context, location, params }) => {
    const activeProperty = findAccessibleProperty(
      context.activeMembership,
      params.propertySlug,
    );

    if (!activeProperty) {
      throw redirect({
        to: "/unauthorized",
        search: { from: location.href },
      });
    }

    return { activeProperty };
  },
  component: Outlet,
});
