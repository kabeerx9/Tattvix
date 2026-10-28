// Guest stays: every check-in the signed-in guest has made, with the hotel,
// room and status. Rows open the stay's detail. Mirrors the web's list.
import { formatDateTime, stayStatusLabel } from "@tattvix/api";
import type { GuestShare } from "@tattvix/contracts";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { Hotel } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { EmptyState, Kpi, KpiRow, LargeTitle, ListRow, Panel, Screen, Spinner, StatusPill, colors, space } from "@/src/design-system";
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
          <KpiRow>
            <Kpi label="Waiting for a room" value={stays.filter((stay) => stay.operationalStatus === "PENDING_CHECK_IN").length} />
            <Kpi label="Checked in" value={stays.filter((stay) => stay.operationalStatus === "CHECKED_IN").length} />
            <Kpi label="Checked out" value={stays.filter((stay) => stay.operationalStatus === "CHECKED_OUT").length} />
          </KpiRow>
          <Panel>
            {stays.map((stay) => (
              <ListRow
                key={stay.id}
                icon={Hotel}
                title={stay.property.name}
                detail={stayDetail(stay)}
                trailing={<StatusPill tone={pillTone[stay.operationalStatus]}>{stayStatusLabel(stay.operationalStatus)}</StatusPill>}
                chevron
                onPress={() => router.push(`/(guest)/stays/${stay.id}` as Href)}
              />
            ))}
          </Panel>
        </View>
      )}
    </Screen>
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
});
