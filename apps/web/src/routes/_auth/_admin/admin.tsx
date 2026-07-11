import { createFileRoute } from "@tanstack/react-router";

import { OrganizationOnboardingPage } from "@/features/platform-organizations/components/organization-onboarding-page";

export const Route = createFileRoute("/_auth/_admin/admin")({
  component: OrganizationOnboardingPage,
});
