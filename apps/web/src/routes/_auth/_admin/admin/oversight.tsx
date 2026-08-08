import { createFileRoute } from "@tanstack/react-router";

import { OversightPage } from "@/features/platform-oversight/components/oversight-page";
import { platformOversightQueries } from "@/features/platform-oversight/queries";

export const Route = createFileRoute("/_auth/_admin/admin/oversight")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(platformOversightQueries.stays()),
  component: OversightPage,
});
