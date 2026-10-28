import { createFileRoute, redirect } from "@tanstack/react-router";
import { HotelReviewsPage } from "@/features/reviews/hotel-reviews-page";
export const Route = createFileRoute("/_auth/_hotel/hotel/$organizationSlug/$propertySlug/reviews")({
  beforeLoad: ({ context, location }) => {
    if (!context.activeMembership.permissions.includes("hotel:manage")) throw redirect({ to: "/unauthorized", search: { from: location.href } });
  },
  component: ReviewsRoute,
});
function ReviewsRoute() { const params = Route.useParams(); return <HotelReviewsPage key={`${params.organizationSlug}/${params.propertySlug}`} {...params} />; }
