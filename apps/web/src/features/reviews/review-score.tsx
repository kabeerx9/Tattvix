import { Star } from "lucide-react";
export function ReviewScore({ rating }: { rating: number }) {
  return <span className="inline-flex items-center gap-1 text-foreground" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => <Star key={n} aria-hidden="true" className="size-4" fill={n <= rating ? "currentColor" : "none"} />)}
    <span className="ml-1 text-sm tabular-nums">{rating}/5</span>
  </span>;
}
