import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/reservations",
)({
  component: () => (
    <PlaceholderPage
      eyebrow="Property operations"
      title="Reservations"
      description="Arrivals, departures, booking details, and stay management for this property."
    />
  ),
});
