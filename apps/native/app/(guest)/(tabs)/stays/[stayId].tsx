// One of the guest's stays: status, the room and dates as facts, the read-only
// bill, and one row for ID sharing that leads to Privacy. Mirrors the web's stay detail. Polls the stay until
// checkout and the bill until it is final, as the web does.
import { getGuestAccessAction, getGuestAccessSummary, getGuestStayFacts, stayStatusLabel } from "@tattvix/api";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Hotel, ShieldCheck } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { GuestBill } from "@/src/components/guest-bill";
import { GuestReviewSection } from "@/src/components/guest-review-section";
import { PendingScreen } from "@/src/components/status-screens";
import { Button, EmptyState, Enter, FactRow, ListRow, Panel, Screen, SecondaryHeader, StatusPill, colors, space, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";

const pillTone = { PENDING_CHECK_IN: "warning", CHECKED_IN: "success", CHECKED_OUT: "neutral" } as const;

export default function GuestStayDetailScreen() {
  const router = useRouter();
  const { stayId } = useLocalSearchParams<{ stayId: string }>();
  const stayQuery = useQuery({
    ...queries.guestStays.detail(stayId),
    refetchInterval: (query) => (query.state.data?.operationalStatus === "CHECKED_OUT" ? false : 5000),
  });
  const billQuery = useQuery({
    ...queries.guestStays.bill(stayId),
    enabled: Boolean(stayQuery.data),
    refetchInterval: (query) => (query.state.data?.isFinal ? false : 5000),
  });

  const stay = stayQuery.data;
  if (!stay) {
    if (stayQuery.isError) {
      return (
        <Screen>
          <SecondaryHeader title="Stay" onBack={() => router.back()} />
          <View style={styles.section}>
            <EmptyState
              icon={Hotel}
              text="This stay could not be loaded. It may not belong to this account."
              action={{ label: "Try again", onPress: () => void stayQuery.refetch(), variant: "outline" }}
            />
            <Button label="Back to my stays" variant="ghost" onPress={() => router.back()} />
          </View>
        </Screen>
      );
    }
    return <PendingScreen />;
  }

  const bill = billQuery.data;
  const sharing = getGuestAccessSummary(getGuestAccessAction(stay));
  const pending = stay.operationalStatus === "PENDING_CHECK_IN";

  return (
    <Screen refreshing={stayQuery.isFetching && !stayQuery.isPending} onRefresh={() => void stayQuery.refetch()}>
      <SecondaryHeader title="Stay" onBack={() => router.back()} />

      <View style={styles.hero}>
        <Text style={styles.name}>{stay.property.name}</Text>
        <StatusPill tone={pillTone[stay.operationalStatus]}>{stayStatusLabel(stay.operationalStatus)}</StatusPill>
      </View>

      {pending ? <Text style={styles.meta}>Reception will assign your room and confirm its charge.</Text> : null}

      <Enter style={styles.section}>
        <Panel>
          {getGuestStayFacts(stay, bill).map((fact) => (
            <FactRow key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </Panel>
      </Enter>

      {stay.operationalStatus === "CHECKED_OUT" ? <GuestReviewSection key={stay.id} stayId={stay.id} /> : null}
      <Enter index={1} style={styles.section}>
        <GuestBill stay={stay} />
      </Enter>

      <Enter index={2} style={styles.section}>
        <Panel>
          <ListRow icon={ShieldCheck} title="ID sharing" detail={sharing.text} detailTone={sharing.open ? "success" : "muted"} chevron onPress={() => router.push("/(guest)/privacy" as Href)} />
        </Panel>
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.sm, marginTop: space.sm, alignItems: "flex-start" },
  name: { ...type.pageTitle, color: colors.foreground },
  section: { marginTop: space.xxl, gap: space.md },
  meta: { ...type.meta, color: colors.mutedForeground, marginTop: space.md },
});
