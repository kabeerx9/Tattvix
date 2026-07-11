import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/guests",
)({
  component: () => (
    <PlaceholderPage
      eyebrow="Property profiles"
      title="Guests"
      description="Guest contact details, stay history, preferences, and notes for this property."
    />
  ),
});
