import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_auth/_admin/admin")({
  component: AdminPage,
});

function AdminPage() {
  return (
    <PlaceholderPage
      eyebrow="Platform administration"
      title="Super admin"
      description="This route is restricted to Tattvix platform administrators and is ready for hotel onboarding and platform oversight workflows."
    />
  );
}
