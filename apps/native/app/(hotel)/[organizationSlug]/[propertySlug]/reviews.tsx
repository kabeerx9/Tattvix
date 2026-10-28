import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { formatDateTime } from "@tattvix/api";
import { StyleSheet, Text, View } from "react-native";
import { Star } from "lucide-react-native";
import { Button, Card, EmptyState, LargeTitle, Screen, SecondaryHeader, TextLink, colors, space, type } from "@/src/design-system";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { useHotelPlace } from "@/src/lib/hotel-place";
import { hotelHref } from "@/src/lib/workspace";
import { queries } from "@/src/lib/api";

export default function ReviewsScreen() {
  const place = useHotelPlace();
  const router = useRouter();
  const [cursors, setCursors] = useState<(number | undefined)[]>([undefined]);
  const page = cursors.length;
  const before = cursors[cursors.length - 1];
  const allowed = place.permissions.includes("hotel:manage");
  const query = useQuery({ ...queries.reviews.hotel(place.organizationSlug, place.propertySlug, before), enabled: allowed, placeholderData: keepPreviousData });
  if (!allowed) return <Screen><SecondaryHeader title="Reviews" onBack={() => router.back()} /><Text style={styles.meta}>Only hotel owners can view reviews.</Text></Screen>;
  if (!query.data) {
    if (query.isError) return <RetryScreen onRetry={() => void query.refetch()} retrying={query.isFetching} />;
    return <PendingScreen />;
  }
  const data = query.data;
  return <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <SecondaryHeader title={place.propertyName} onBack={() => router.back()} />
    <LargeTitle meta={`${data.summary.totalReviews} ${data.summary.totalReviews === 1 ? "review" : "reviews"}${data.summary.averageRating !== null ? ` · ${data.summary.averageRating.toFixed(1)} / 5 average` : ""}`}>Reviews</LargeTitle>
    {query.isError ? <><Text accessibilityRole="alert" style={styles.error}>Reviews could not be refreshed.</Text><Button label="Try again" variant="outline" onPress={() => void query.refetch()} /></> : null}
    <View style={styles.list}>{data.reviews.length ? data.reviews.map((review) => <Card key={review.id} style={styles.card}>
      <Text style={styles.title}>{review.guestName}</Text>
      <Text accessibilityLabel={`${review.rating} out of 5 stars`} style={styles.score}>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)} · {review.rating}/5</Text>
      <Text style={styles.meta}>Submitted {formatDateTime(review.createdAt)}{review.checkedOutAt ? ` · Checked out ${formatDateTime(review.checkedOutAt)}` : ""}</Text>
      <Text selectable style={styles.body}>{review.comment}</Text>
      <TextLink label="View guest stay" onPress={() => router.push(`${hotelHref(place)}/stays/${review.stayId}` as Href)} />
    </Card>) : <EmptyState icon={Star} text="No reviews yet. Guests can leave a review after checkout." />}</View>
    {page > 1 || data.hasMore ? <View style={styles.pages}><Button label="Previous" variant="outline" disabled={page === 1 || query.isFetching} onPress={() => setCursors(cursors.slice(0, -1))} /><Text style={styles.meta}>Page {page}</Text><Button label="Next" variant="outline" disabled={!data.hasMore || query.isFetching} onPress={() => data.nextCursor !== null && setCursors([...cursors, data.nextCursor])} /></View> : null}
  </Screen>;
}
const styles = StyleSheet.create({ list: { marginTop: space.xl, gap: space.lg }, card: { gap: space.md }, title: { ...type.cardTitle, color: colors.foreground }, score: { ...type.rowTitle, color: colors.foreground }, body: { ...type.body, color: colors.foreground }, meta: { ...type.caption, color: colors.mutedForeground }, error: { ...type.caption, color: colors.destructive }, pages: { marginTop: space.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm } });
