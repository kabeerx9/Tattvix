import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_auth/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <PlaceholderPage
      eyebrow="Workspace"
      title="Settings"
      description="A future configuration area for property details, team access, and operational preferences."
    />
  );
}
