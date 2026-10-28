// Privacy: which hotels can see the guest's ID right now, and which no longer
// can. One row per stay with one line of status; the detail (what the hotel
// opened, and stopping sharing) opens in a sheet. Mirrors
// apps/web/src/features/check-in/components/privacy-center-page.tsx.
import {
  accessActivityLabel,
  checkInKeys,
  describeGuestAccess,
  formatDateTime,
  getGuestAccessAction,
  getGuestAccessSummary,
  groupAccessEvents,
} from "@tattvix/api";
import type { GuestShare } from "@tattvix/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BottomSheet, Button, ConfirmSheet, EmptyState, Enter, LargeTitle, Screen, ListRow, Panel, GroupTitle, Spinner, colors, space, toast, type } from "@/src/design-system";
import { api, queries } from "@/src/lib/api";
import { errorMessage } from "@/src/lib/format";

export default function PrivacyScreen() {
  const queryClient = useQueryClient();
  const query = useQuery({ ...queries.checkIn.shares(), refetchInterval: 30_000 });
  const stays = query.data?.stays ?? [];
  const [openId, setOpenId] = useState<string | null>(null);
  const [stopTarget, setStopTarget] = useState<GuestShare | null>(null);

  const revoke = useMutation({
    mutationFn: (stayId: string) => api.checkIn.revoke(stayId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: checkInKeys.all });
      setStopTarget(null);
      toast("Sharing stopped");
    },
  });

  // Grouped by what the guest cares about: can this hotel still see my ID?
  const rows = stays.map((stay) => ({ stay, summary: getGuestAccessSummary(getGuestAccessAction(stay)) }));
  const sharing = rows.filter((row) => row.summary.open);
  const ended = rows.filter((row) => !row.summary.open);
  const opened = stays.find((stay) => stay.id === openId) ?? null;

  const section = (title: string, list: typeof rows, index: number) =>
    list.length ? (
      <Enter index={index} style={styles.section}>
        <GroupTitle>{title}</GroupTitle>
        <Panel>
          {list.map(({ stay, summary }) => (
            <ListRow key={stay.id} title={stay.property.name} detail={summary.text} detailTone={summary.open ? "success" : "muted"} chevron onPress={() => setOpenId(stay.id)} />
          ))}
        </Panel>
      </Enter>
    ) : null;

  return (
    <Screen refreshing={query.isFetching && !query.isPending} onRefresh={() => void query.refetch()}>
      <LargeTitle meta="Hotels that can see your ID">Privacy</LargeTitle>
      {query.isPending ? (
        <View style={styles.center}>
          <Spinner color={colors.mutedForeground} />
        </View>
      ) : query.isError ? (
        <EmptyState icon={ShieldCheck} text="Your privacy history could not be loaded." action={{ label: "Try again", onPress: () => void query.refetch(), variant: "outline" }} />
      ) : stays.length === 0 ? (
        <EmptyState icon={ShieldCheck} text="Nothing shared yet. A hotel sees your ID only after you check in there." />
      ) : (
        <>
          {section("Sharing now", sharing, 0)}
          {section("Ended", ended, 1)}
        </>
      )}

      <StaySheet
        stay={opened}
        onClose={() => setOpenId(null)}
        onStop={(stay) => {
          setOpenId(null);
          revoke.reset();
          setStopTarget(stay);
        }}
      />
      <ConfirmSheet
        open={stopTarget !== null}
        onClose={() => {
          if (revoke.isPending) return;
          setStopTarget(null);
          revoke.reset();
        }}
        title={`Stop sharing with ${stopTarget?.property.name ?? "this hotel"}?`}
        description={
          revoke.isError
            ? errorMessage(revoke.error, "Sharing could not be stopped.") ?? "Sharing could not be stopped."
            : "They lose access to your ID right away. The stay stays in your history."
        }
        confirmLabel="Stop sharing"
        tone="destructive"
        loading={revoke.isPending}
        onConfirm={() => {
          if (stopTarget) revoke.mutate(stopTarget.id);
        }}
      />
    </Screen>
  );
}

function StaySheet({ stay, onClose, onStop }: { stay: GuestShare | null; onClose: () => void; onStop: (stay: GuestShare) => void }) {
  const access = stay ? getGuestAccessAction(stay) : null;
  const activity = stay ? groupAccessEvents(stay.accessEvents).slice(0, 8) : [];
  return (
    <BottomSheet
      open={stay !== null}
      onClose={onClose}
      title={stay?.property.name}
      footer={stay && access?.kind === "revocable" ? <Button label="Stop sharing" variant="outline" onPress={() => onStop(stay)} /> : undefined}
    >
      {stay && access ? (
        <View style={styles.sheet}>
          <View style={styles.block}>
            <Text style={styles.body}>{describeGuestAccess(access, { format: formatDateTime })}</Text>
            <Text style={styles.meta}>{[stay.room ? `Room ${stay.room.number}` : null, stayMoment(stay)].filter(Boolean).join(" · ")}</Text>
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>History</Text>
            {activity.length ? (
              activity.map((group, index) => (
                <View key={`${group.lastAt}-${index}`} style={styles.activityRow}>
                  <Text style={styles.activityText}>
                    {accessActivityLabel(group)}
                    {group.count > 1 ? ` ×${group.count}` : ""}
                  </Text>
                  <Text style={styles.activityTime}>{formatDateTime(group.lastAt)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.meta}>Nothing yet.</Text>
            )}
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

function stayMoment(stay: GuestShare) {
  if (stay.checkedOutAt) return `Checked out ${formatDateTime(stay.checkedOutAt)}`;
  if (stay.checkedInAt) return `Checked in ${formatDateTime(stay.checkedInAt)}`;
  return "Waiting for a room";
}

const styles = StyleSheet.create({
  center: { alignItems: "center", paddingVertical: space.xxxl },
  section: { gap: space.md, marginTop: space.xl },
  sheet: { gap: space.xl, paddingBottom: space.md },
  block: { gap: space.sm },
  body: { ...type.body, color: colors.foreground },
  meta: { ...type.meta, color: colors.mutedForeground },
  label: { ...type.label, color: colors.subtleForeground },
  activityRow: { flexDirection: "row", gap: space.md, paddingVertical: 2 },
  activityText: { ...type.meta, color: colors.foreground, flex: 1 },
  activityTime: { ...type.meta, color: colors.mutedForeground, fontVariant: ["tabular-nums"] },
});
