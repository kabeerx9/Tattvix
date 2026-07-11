import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/",
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/hotel/$organizationSlug/$propertySlug/dashboard",
      params,
    });
  },
});
