import { createFileRoute } from "@tanstack/react-router";

import { OrganizationListPage } from "@/features/platform-organizations/components/organization-list-page";
import { platformOrganizationQueries } from "@/features/platform-organizations/queries";

export const Route = createFileRoute("/_auth/_admin/admin/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(platformOrganizationQueries.list()),
  component: OrganizationListPage,
});
