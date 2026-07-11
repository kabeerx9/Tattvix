import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { findAccessibleMembership } from "@/lib/hotel-scope";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug",
)({
  beforeLoad: ({ context, location, params }) => {
    const activeMembership = findAccessibleMembership(
      context.auth.currentUser,
      params.organizationSlug,
    );

    if (!activeMembership) {
      throw redirect({
        to: "/unauthorized",
        search: { from: location.href },
      });
    }

    return { activeMembership };
  },
  component: Outlet,
});
