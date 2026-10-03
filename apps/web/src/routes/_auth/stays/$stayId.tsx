import { createFileRoute } from "@tanstack/react-router";
import { GuestStayDetailPage } from "@/features/guest-stays/components/guest-stay-detail-page";
export const Route = createFileRoute("/_auth/stays/$stayId")({
  component: StayPage,
});
function StayPage() {
  const { stayId } = Route.useParams();
  return <GuestStayDetailPage key={stayId} stayId={stayId} />;
}
