import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classifyApiError, formatDateTime, submitReviewMutation } from "@tattvix/api";
import { reviewInputSchema } from "@tattvix/contracts";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, TextField, colors, space, type } from "@/src/design-system";
import { api, queries } from "@/src/lib/api";

export function GuestReviewSection({ stayId }: { stayId: string }) {
  const client = useQueryClient();
  const query = useQuery(queries.reviews.guest(stayId));
  const mutation = useMutation(submitReviewMutation(api.reviews, client, stayId));
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const review = query.data?.review;
  function submit() {
    const input = reviewInputSchema.safeParse({ rating, comment });
    if (!input.success) { setError(rating === 0 ? "Choose a star rating." : input.error.issues[0]?.message ?? "Check your review."); return; }
    setError(""); mutation.mutate(input.data);
  }
  return <Card style={styles.card}>
    <Text style={styles.title}>{review ? "Your review" : "Rate your stay"}</Text>
    {query.isPending ? <Text style={styles.meta}>Loading your review...</Text> : null}
    {query.isError ? <><Text accessibilityRole="alert" style={styles.error}>Your review could not be loaded.</Text><Button label="Try again" variant="outline" onPress={() => void query.refetch()} /></> : null}
    {review ? <><Text accessibilityLabel={`${review.rating} out of 5 stars`} style={styles.score}>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)} · {review.rating}/5</Text><Text selectable style={styles.body}>{review.comment}</Text><Text style={styles.meta}>Submitted {formatDateTime(review.createdAt)}. Reviews cannot be edited.</Text></> : query.data?.canReview ? <>
      <Text style={styles.body}>Rating</Text>
      <View style={styles.stars}>{[1,2,3,4,5].map((n) => <View key={n} style={styles.star}><Button label={`${n}★`} accessibilityLabel={`Rate ${n} ${n === 1 ? "star" : "stars"}${rating === n ? ", selected" : ""}`} variant={rating === n ? "outline" : "ghost"} disabled={mutation.isPending} onPress={() => setRating(n)} /></View>)}</View>
      {rating ? <Text style={styles.meta}>{rating} out of 5 stars</Text> : null}
      <TextField label="Your review" accessibilityLabel="Your review" placeholder="How was your stay?" multiline maxLength={2000} value={comment} onChangeText={setComment} editable={!mutation.isPending} helper={`${comment.length}/2,000 characters`} />
      <Text style={styles.meta}>Once submitted, your review cannot be edited.</Text>
      {error || mutation.isError ? <Text accessibilityRole="alert" style={styles.error}>{error || classifyApiError(mutation.error).message}</Text> : null}
      <Button label="Submit review" loading={mutation.isPending} onPress={submit} />
    </> : query.data ? <Text style={styles.meta}>Reviews become available after the hotel completes checkout.</Text> : null}
  </Card>;
}
const styles = StyleSheet.create({ card: { marginTop: space.xl, gap: space.md }, title: { ...type.cardTitle, color: colors.foreground }, body: { ...type.body, color: colors.foreground }, meta: { ...type.caption, color: colors.mutedForeground }, score: { ...type.rowTitle, color: colors.foreground }, error: { ...type.caption, color: colors.destructive }, stars: { flexDirection: "row", gap: space.xs }, star: { flex: 1 } });
