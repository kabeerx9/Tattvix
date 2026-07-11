import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { hasPlatformPermission } from "@/lib/router-auth";

export const Route = createFileRoute("/_auth/_admin")({
  beforeLoad: ({ context, location }) => {
    if (!hasPlatformPermission(context.auth, "platform:admin")) {
      throw redirect({
        to: "/unauthorized",
        search: { from: location.href },
      });
    }
  },
  component: Outlet,
});
