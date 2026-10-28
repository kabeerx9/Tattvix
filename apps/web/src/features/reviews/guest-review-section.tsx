import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classifyApiError, submitReviewMutation } from "@tattvix/api";
import { reviewInputSchema } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Textarea } from "@tattvix/ui/components/textarea";
import { Label } from "@tattvix/ui/components/label";
import { Star } from "lucide-react";
import { Panel, PanelHeader, PanelSection } from "@/components/design-system";
import { reviewQueries, reviewsApi } from "./api";
import { ReviewScore } from "./review-score";

export function GuestReviewSection({ stayId }: { stayId: string }) {
  const client = useQueryClient();
  const query = useQuery(reviewQueries.guest(stayId));
  const mutation = useMutation(submitReviewMutation(reviewsApi, client, stayId));
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const review = query.data?.review;
  return <Panel>
    <PanelHeader title={review ? "Your review" : "Rate your stay"} />
    <PanelSection>
      {query.isPending ? <p role="status">Loading your review...</p> : null}
      {query.isError ? <div role="alert" className="grid justify-items-start gap-3"><p>Your review could not be loaded.</p><Button variant="outline" onClick={() => void query.refetch()}>Try again</Button></div> : null}
      {review ? <div className="grid gap-3"><ReviewScore rating={review.rating} /><p className="whitespace-pre-wrap wrap-anywhere text-sm">{review.comment}</p><p className="text-xs text-muted-foreground">Submitted {new Date(review.createdAt).toLocaleDateString()}. Reviews cannot be edited.</p></div> : query.data?.canReview ? (
        <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          const input = reviewInputSchema.safeParse({ rating, comment });
          if (!input.success) { setError(rating === 0 ? "Choose a star rating." : input.error.issues[0]?.message ?? "Check your review."); return; }
          setError(""); mutation.mutate(input.data);
        }}>
          <fieldset disabled={mutation.isPending} className="grid gap-2"><legend className="mb-2 text-sm font-medium">Rating</legend><div className="flex gap-2">
            {[1,2,3,4,5].map((n) => <Button key={n} type="button" size="icon" variant="outline" className="size-11" aria-label={`Rate ${n} ${n === 1 ? "star" : "stars"}`} aria-pressed={rating === n} onClick={() => setRating(n)}><Star aria-hidden="true" fill={n <= rating ? "currentColor" : "none"} /></Button>)}
          </div>{rating ? <p className="text-sm text-muted-foreground" aria-live="polite">{rating} out of 5 stars</p> : null}</fieldset>
          <div className="grid gap-2"><Label htmlFor={`review-${stayId}`}>Your review</Label><Textarea id={`review-${stayId}`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={4} disabled={mutation.isPending} placeholder="How was your stay?" /><p className="text-xs text-muted-foreground tabular-nums">{comment.length}/2,000 characters</p></div>
          <p className="text-sm text-muted-foreground">Once submitted, your review cannot be edited.</p>
          {error || mutation.isError ? <p role="alert" className="text-sm text-destructive">{error || classifyApiError(mutation.error).message}</p> : null}
          <Button type="submit" disabled={mutation.isPending} className="justify-self-start">{mutation.isPending ? "Submitting..." : "Submit review"}</Button>
        </form>
      ) : query.data ? <p className="text-sm text-muted-foreground">Reviews become available after the hotel completes checkout.</p> : null}
    </PanelSection>
  </Panel>;
}
