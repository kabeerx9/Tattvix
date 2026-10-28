import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@tattvix/ui/components/button";
import { PageHeader, Panel, PanelSection, EmptyState } from "@/components/design-system";
import { Star } from "lucide-react";
import { reviewQueries } from "./api";
import { ReviewScore } from "./review-score";

export function HotelReviewsPage({ organizationSlug, propertySlug }: { organizationSlug: string; propertySlug: string }) {
  const [cursors, setCursors] = useState<(number | undefined)[]>([undefined]);
  const page = cursors.length;
  const before = cursors[cursors.length - 1];
  const query = useQuery({ ...reviewQueries.hotel(organizationSlug, propertySlug, before), placeholderData: keepPreviousData });
  const data = query.data;
  return <div className="mx-auto grid max-w-4xl gap-6">
    <PageHeader title="Reviews" meta={data ? `${data.summary.totalReviews} ${data.summary.totalReviews === 1 ? "review" : "reviews"}${data.summary.averageRating !== null ? ` · ${data.summary.averageRating.toFixed(1)} / 5 average` : ""}` : undefined} />
    {query.isPending ? <Panel><PanelSection><p role="status">Loading reviews...</p></PanelSection></Panel> : null}
    {query.isError ? <Panel><PanelSection><p role="alert">Reviews could not be loaded.</p><Button variant="outline" onClick={() => void query.refetch()}>Try again</Button></PanelSection></Panel> : null}
    {data?.reviews.length ? <Panel>{data.reviews.map((review) => <PanelSection key={review.id} className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><Link className="font-medium text-primary underline-offset-4 hover:underline" to="/hotel/$organizationSlug/$propertySlug/stays/$stayId" params={{ organizationSlug, propertySlug, stayId: review.stayId }}>{review.guestName} · View guest stay</Link><p className="mt-1 text-xs text-muted-foreground">Submitted {new Date(review.createdAt).toLocaleDateString()}{review.checkedOutAt ? ` · Checked out ${new Date(review.checkedOutAt).toLocaleDateString()}` : ""}</p></div><ReviewScore rating={review.rating} /></div>
      <p className="whitespace-pre-wrap wrap-anywhere text-sm">{review.comment}</p>
    </PanelSection>)}</Panel> : data ? <Panel><EmptyState icon={Star} title="No reviews yet" description="Guests can leave a review after checkout. Their feedback will appear here." /></Panel> : null}
    {data && (page > 1 || data.hasMore) ? <div className="flex items-center justify-between gap-3"><Button variant="outline" disabled={page === 1 || query.isFetching} onClick={() => setCursors(cursors.slice(0, -1))}>Previous</Button><span className="text-sm text-muted-foreground tabular-nums">Page {page}</span><Button variant="outline" disabled={!data.hasMore || query.isFetching} onClick={() => data.nextCursor !== null && setCursors([...cursors, data.nextCursor])}>Next</Button></div> : null}
  </div>;
}
