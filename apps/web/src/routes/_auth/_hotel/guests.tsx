import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_auth/_hotel/guests")({
  component: GuestsPage,
});

function GuestsPage() {
  return (
    <PlaceholderPage
      eyebrow="Profiles"
      title="Guests"
      description="A future guest directory for contact details, stay history, preferences, and notes."
    />
  );
}
