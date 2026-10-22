import { createFileRoute } from "@tanstack/react-router";

import { platformOrganizationQueries } from "@/features/platform-organizations/queries";
import { PortfolioOverviewPage } from "@/features/platform-portfolio/components/portfolio-overview-page";
import { platformPortfolioQueries } from "@/features/platform-portfolio/queries";

export const Route = createFileRoute("/_auth/_admin/admin/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(platformPortfolioQueries.list()),
      context.queryClient.ensureQueryData(platformOrganizationQueries.list()),
    ]),
  component: PortfolioOverviewPage,
});
