import { z } from "zod";
const dateTimeSchema = z.iso.datetime({ offset: true });
export const reviewInputSchema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().min(1, "Write a review.").max(2000, "Keep your review under 2,000 characters.") }).strict();
export const stayReviewSchema = reviewInputSchema.extend({ id: z.number().int().positive(), createdAt: dateTimeSchema }).strict();
export const guestReviewStateSchema = z.object({ review: stayReviewSchema.nullable(), canReview: z.boolean() }).strict();
export const hotelReviewsSchema = z.object({
  reviews: z.array(stayReviewSchema.extend({ stayId: z.uuid(), guestName: z.string(), checkedOutAt: dateTimeSchema.nullable() }).strict()).max(25),
  pageSize: z.literal(25), hasMore: z.boolean(), nextCursor: z.number().int().positive().nullable(),
  summary: z.object({ totalReviews: z.number().int().nonnegative(), averageRating: z.number().min(1).max(5).nullable() }).strict(),
}).strict();
export type ReviewInput = z.infer<typeof reviewInputSchema>;
export type StayReview = z.infer<typeof stayReviewSchema>;
export type GuestReviewState = z.infer<typeof guestReviewStateSchema>;
export type HotelReviews = z.infer<typeof hotelReviewsSchema>;
