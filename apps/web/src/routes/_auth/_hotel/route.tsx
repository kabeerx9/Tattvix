import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { hasAnyHotelPermission } from "@/lib/router-auth";

export const Route = createFileRoute("/_auth/_hotel")({
  beforeLoad: ({ context, location }) => {
    if (!hasAnyHotelPermission(context.auth, "hotel:view")) {
      throw redirect({
        to: "/unauthorized",
        search: { from: location.href },
      });
    }
  },
  component: Outlet,
});
