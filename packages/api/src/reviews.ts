import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { guestReviewStateSchema, hotelReviewsSchema, reviewInputSchema, type ApiClient, type ReviewInput, ApiError } from "@tattvix/contracts";

export const reviewKeys = {
  guest: (stayId: string) => ["stay-review", stayId] as const,
  hotels: ["hotel-reviews"] as const,
  hotel: (org: string, property: string, before?: number) => ["hotel-reviews", org, property, before ?? "first"] as const,
};
export function createReviewsApi(client: ApiClient) {
  const guestPath = (stayId: string) => `/api/guest/stays/${encodeURIComponent(stayId)}/review/`;
  return {
    guest: (stayId: string) => client.requestJson(guestPath(stayId), guestReviewStateSchema),
    submit: (stayId: string, input: ReviewInput) => client.requestJson(guestPath(stayId), guestReviewStateSchema, { method: "POST", body: JSON.stringify(reviewInputSchema.parse(input)) }),
    hotel: (org: string, property: string, before?: number) => client.requestJson(`/api/hotel/${encodeURIComponent(org)}/${encodeURIComponent(property)}/reviews/${before === undefined ? "" : `?before=${before}`}`, hotelReviewsSchema),
  };
}
export type ReviewsApi = ReturnType<typeof createReviewsApi>;
export function createReviewQueries(api: ReviewsApi) {
  return {
    guest: (stayId: string) => queryOptions({ queryKey: reviewKeys.guest(stayId), queryFn: () => api.guest(stayId), staleTime: 30_000 }),
    hotel: (org: string, property: string, before?: number) => queryOptions({ queryKey: reviewKeys.hotel(org, property, before), queryFn: () => api.hotel(org, property, before), staleTime: 30_000 }),
  };
}
export function submitReviewMutation(api: ReviewsApi, client: QueryClient, stayId: string) {
  return {
    mutationFn: (input: ReviewInput) => api.submit(stayId, input),
    onSuccess: async (state: Awaited<ReturnType<ReviewsApi["submit"]>>) => {
      client.setQueryData(reviewKeys.guest(stayId), state);
      await client.invalidateQueries({ queryKey: reviewKeys.hotels });
    },
    onError: async (error: unknown) => {
      // Another device may have submitted while this form was open. Fetch the
      // immutable result rather than leaving an edit-looking form behind.
      if (error instanceof ApiError && error.status === 409) await client.invalidateQueries({ queryKey: reviewKeys.guest(stayId) });
    },
  };
}
