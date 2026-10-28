// Guest stays: every check-in the signed-in guest has made, with the hotel,
// room and status. Rows open the stay's detail. Mirrors the web's list.
import { formatDateTime, stayStatusLabel } from "@tattvix/api";
import type { GuestShare } from "@tattvix/contracts";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { ChevronRight, Hotel } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { EmptyState, LargeTitle, Panel, Screen, Spinner, StatusPill, colors, space, type } from "@/src/design-system";
import { usePressFeedback } from "@/src/design-system/press";
import { queries } from "@/src/lib/api";

const pillTone = { PENDING_CHECK_IN: "warning", CHECKED_IN: "success", CHECKED_OUT: "neutral" } as const;

export default function GuestStaysScreen() {
  const router = useRouter();
  const query = useQuery({ ...queries.checkIn.shares(), refetchInterval: 30_000 });
  const stays = query.data?.stays ?? [];

  return (
    <Screen refreshing={query.isFetching && !query.isPending} onRefresh={() => void query.refetch()}>
      <LargeTitle meta="Past and upcoming stays, with check-in details.">My stays</LargeTitle>

      {query.isPending ? (
        <View style={styles.center}>
          <Spinner color={colors.mutedForeground} />
        </View>
      ) : query.isError ? (
        <View style={styles.section}>
          <EmptyState
            icon={Hotel}
            text="Your stays could not be loaded."
            action={{ label: "Try again", onPress: () => void query.refetch(), variant: "outline" }}
          />
        </View>
      ) : stays.length === 0 ? (
        <View style={styles.section}>
          <EmptyState icon={Hotel} text="No stays yet. Scan the hotel's QR and send your check-in request. Your stay and bill will appear here." />
        </View>
      ) : (
        <View style={styles.section}>
          <Panel>
            {stays.map((stay) => (
              <StayRow key={stay.id} stay={stay} onPress={() => router.push(`/(guest)/stays/${stay.id}` as Href)} />
            ))}
          </Panel>
        </View>
      )}
    </Screen>
  );
}

// The hotel name wraps and the status sits under it, so a long name is never
// cut short to make room for the pill.
function StayRow({ stay, onPress }: { stay: GuestShare; onPress: () => void }) {
  const press = usePressFeedback();
  const status = stayStatusLabel(stay.operationalStatus);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${stay.property.name}, ${status}`} accessibilityHint={stayDetail(stay)} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.row, press.style]}>
        <Hotel color={colors.foreground} size={22} strokeWidth={1.6} />
        <View style={styles.copy}>
          <Text style={styles.title}>{stay.property.name}</Text>
          <Text style={styles.detail}>{stayDetail(stay)}</Text>
          <View style={styles.pill}>
            <StatusPill tone={pillTone[stay.operationalStatus]}>{status}</StatusPill>
          </View>
        </View>
        <ChevronRight color={colors.subtleForeground} size={18} strokeWidth={2} />
      </Animated.View>
    </Pressable>
  );
}

function stayDetail(stay: GuestShare) {
  const room = stay.room ? `Room ${stay.room.number} · ` : "";
  const when = stay.submittedAt ? formatDateTime(stay.submittedAt) : "Check-in request submitted";
  return `${room}${when}`;
}

const styles = StyleSheet.create({
  center: { alignItems: "center", paddingVertical: space.xxxl },
  section: { marginTop: space.xxl, gap: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, paddingVertical: space.md, paddingHorizontal: space.lg },
  copy: { flex: 1, gap: 2 },
  title: { ...type.rowTitle, color: colors.foreground },
  detail: { ...type.caption, color: colors.mutedForeground },
  pill: { marginTop: space.xs },
});
