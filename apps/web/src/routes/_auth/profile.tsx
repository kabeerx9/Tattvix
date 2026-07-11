import { createFileRoute } from "@tanstack/react-router";

import { GuestProfilePage } from "@/features/guest-profile/components/guest-profile-page";
import { guestProfileQueries } from "@/features/guest-profile/queries";

export const Route = createFileRoute("/_auth/profile")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(guestProfileQueries.detail()),
  component: GuestProfilePage,
});
