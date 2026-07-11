import { createFileRoute } from "@tanstack/react-router";

import { CompanionsPage } from "@/features/companions/components/companions-page";
import { companionQueries } from "@/features/companions/queries";

export const Route = createFileRoute("/_auth/companions")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(companionQueries.list()),
  component: CompanionsPage,
});
