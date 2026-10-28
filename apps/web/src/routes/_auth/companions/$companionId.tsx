import { createFileRoute } from "@tanstack/react-router";

import { CompanionPage } from "@/features/companions/components/companion-page";
import { companionQueries } from "@/features/companions/queries";

export const Route = createFileRoute("/_auth/companions/$companionId")({
  loader: ({ context }) => context.queryClient.ensureQueryData(companionQueries.list()),
  component: CompanionRoute,
});

function CompanionRoute() {
  const { companionId } = Route.useParams();
  return <CompanionPage key={companionId} companionId={companionId} />;
}
