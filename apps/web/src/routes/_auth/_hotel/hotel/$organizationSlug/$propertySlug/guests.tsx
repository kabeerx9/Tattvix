import { createFileRoute, redirect } from "@tanstack/react-router";

// The Guests page was folded into Stays; old links land there.
export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/guests",
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/hotel/$organizationSlug/$propertySlug/stays",
      params,
    });
  },
});
