import { createFileRoute } from "@tanstack/react-router";

import { PrivacyCenterPage } from "@/features/check-in/components/privacy-center-page";
import { checkInQueries } from "@/features/check-in/queries";

export const Route = createFileRoute("/_auth/privacy")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(checkInQueries.shares()),
  component: PrivacyCenterPage,
});
