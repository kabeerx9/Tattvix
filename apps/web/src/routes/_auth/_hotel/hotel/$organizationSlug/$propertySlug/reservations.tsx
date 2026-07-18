import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/reservations",
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/hotel/$organizationSlug/$propertySlug/stays",
      params,
    });
  },
});
