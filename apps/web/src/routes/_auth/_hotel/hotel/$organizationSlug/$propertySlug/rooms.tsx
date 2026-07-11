import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/rooms",
)({
  component: () => (
    <PlaceholderPage
      eyebrow="Property inventory"
      title="Rooms"
      description="Room inventory, readiness, housekeeping state, and maintenance for this property."
    />
  ),
});
