import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_auth/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <PlaceholderPage
      eyebrow="Guest account"
      title="Account settings"
      description="A future configuration area for account security, personal preferences, privacy, and data controls."
    />
  );
}
