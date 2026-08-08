import { createFileRoute } from "@tanstack/react-router";

import { OrganizationDetailPage } from "@/features/platform-organizations/components/organization-detail-page";
import { platformOrganizationQueries } from "@/features/platform-organizations/queries";

export const Route = createFileRoute("/_auth/_admin/admin/$organizationSlug")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      platformOrganizationQueries.detail(params.organizationSlug),
    ),
  component: PlatformOrganizationDetailRoute,
});

function PlatformOrganizationDetailRoute() {
  const params = Route.useParams();
  return <OrganizationDetailPage organizationSlug={params.organizationSlug} />;
}
