import { createReviewsApi, createReviewQueries } from "@tattvix/api";
import { apiClient } from "@/lib/api";
export const reviewsApi = createReviewsApi(apiClient);
export const reviewQueries = createReviewQueries(reviewsApi);
