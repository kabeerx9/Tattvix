import { createFileRoute } from "@tanstack/react-router";

import { GuestProfilePage } from "@/features/guest-profile/components/guest-profile-page";
import { guestProfileQueries } from "@/features/guest-profile/queries";
import { identityDocumentQueries } from "@/features/identity-documents/queries";

export const Route = createFileRoute("/_auth/profile")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(guestProfileQueries.detail()),
      context.queryClient.ensureQueryData(identityDocumentQueries.list()),
    ]),
  component: GuestProfilePage,
});
