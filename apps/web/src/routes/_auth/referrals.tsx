import {
  createFileRoute,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";
import { getAccountSettings } from "@tattvix/api";
import { ReferralsPage } from "@/features/referrals/referrals-page";
export const Route = createFileRoute("/_auth/referrals")({
  beforeLoad: ({ context, location }) => {
    if (!getAccountSettings(context.auth.currentUser).isOwner)
      throw redirect({ to: "/unauthorized", search: { from: location.href } });
  },
  component: ReferralRoute,
});
function ReferralRoute() {
  const { auth } = useRouteContext({ from: "__root__" });
  return auth.currentUser && getAccountSettings(auth.currentUser).isOwner ? (
    <ReferralsPage key={auth.currentUser.id} ownerId={auth.currentUser.id} />
  ) : null;
}
