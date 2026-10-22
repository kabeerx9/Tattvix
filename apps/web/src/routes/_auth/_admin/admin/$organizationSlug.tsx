import { createFileRoute } from "@tanstack/react-router";

import { OrganizationDetailPage } from "@/features/platform-organizations/components/organization-detail-page";
import { platformOrganizationQueries } from "@/features/platform-organizations/queries";
import { platformPortfolioQueries } from "@/features/platform-portfolio/queries";

export const Route = createFileRoute("/_auth/_admin/admin/$organizationSlug")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        platformOrganizationQueries.detail(params.organizationSlug),
      ),
      context.queryClient.ensureQueryData(
        platformPortfolioQueries.list(params.organizationSlug),
      ),
    ]),
  component: PlatformOrganizationDetailRoute,
});

function PlatformOrganizationDetailRoute() {
  const params = Route.useParams();
  return <OrganizationDetailPage organizationSlug={params.organizationSlug} />;
}
