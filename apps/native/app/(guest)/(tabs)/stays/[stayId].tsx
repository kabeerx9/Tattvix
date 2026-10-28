import { GuestReviewSection } from "@/src/components/guest-review-section";
// One of the guest's stays: the hotel, room and dates, what the hotel can see,
// and the read-only bill. Mirrors the web's stay detail. Polls the stay until
// checkout and the bill until it is final, as the web does.
import { describeGuestAccess, formatDateTime, formatMoneyMinor, getGuestAccessAction, stayStatusLabel } from "@tattvix/api";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Hotel } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { GuestBill } from "@/src/components/guest-bill";
import { PendingScreen } from "@/src/components/status-screens";
import { Button, Card, EmptyState, Screen, SecondaryHeader, StatusPill, colors, space, type } from "@/src/design-system";
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
  const access = getGuestAccessAction(stay);
  const consent =
    stay.status === "REVOKED"
      ? { tone: "destructive" as const, label: "Consent revoked" }
      : stay.status === "CLOSED"
        ? { tone: "neutral" as const, label: "Identity review complete" }
        : { tone: "success" as const, label: "Consent approved" };
  const pending = stay.operationalStatus === "PENDING_CHECK_IN";

  return (
    <Screen refreshing={stayQuery.isFetching && !stayQuery.isPending} onRefresh={() => void stayQuery.refetch()}>
      <SecondaryHeader title="Stay" onBack={() => router.back()} />

      <View style={styles.hero}>
        <Text style={styles.name}>{stay.property.name}</Text>
        <StatusPill tone={pillTone[stay.operationalStatus]}>{stayStatusLabel(stay.operationalStatus)}</StatusPill>
      </View>

      <View style={styles.facts}>
        <Fact label="Room">{stay.room ? `Room ${stay.room.number}` : "Awaiting assignment"}</Fact>
        <Fact label="Submitted">{stay.submittedAt ? formatDateTime(stay.submittedAt) : "—"}</Fact>
        {stay.checkedInAt ? <Fact label="Checked in">{formatDateTime(stay.checkedInAt)}</Fact> : null}
        {stay.checkedOutAt ? <Fact label="Checked out">{formatDateTime(stay.checkedOutAt)}</Fact> : null}
        {bill?.roomNights != null ? (
          <Fact label="Nights">{`${bill.roomNights}${bill.nightlyRateMinor != null ? ` at ${formatMoneyMinor(bill.nightlyRateMinor)} a night` : ""}`}</Fact>
        ) : null}
      </View>

      {pending ? <Text style={styles.meta}>Your request was sent. Reception will assign a room and confirm its charge.</Text> : null}

      {stay.operationalStatus === "CHECKED_OUT" ? <GuestReviewSection key={stay.id} stayId={stay.id} /> : null}
      <View style={styles.section}>
        <GuestBill stay={stay} />
      </View>

      <Card style={styles.section}>
        <Text style={styles.title}>Identity sharing</Text>
        <StatusPill tone={consent.tone}>{consent.label}</StatusPill>
        <Text style={styles.meta}>{describeGuestAccess(access)}</Text>
        <Text style={styles.meta}>
          {stay.status === "REVOKED"
            ? "You revoked identity access. Your stay and bill remain available."
            : access.kind === "revocable"
              ? "To stop sharing before access ends, use the Privacy center."
              : "See when the hotel opened your details in the Privacy center."}
        </Text>
        <Button label="Privacy center" variant="outline" onPress={() => router.push("/(guest)/privacy" as Href)} />
      </Card>
    </Screen>
  );
}

function Fact({ label, children }: { label: string; children: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.sm, marginTop: space.sm, alignItems: "flex-start" },
  name: { ...type.pageTitle, color: colors.foreground },
  facts: { marginTop: space.lg, gap: space.md },
  fact: { gap: 2 },
  factLabel: { ...type.label, color: colors.subtleForeground },
  factValue: { ...type.rowTitle, color: colors.foreground },
  section: { marginTop: space.xxl, gap: space.md },
  title: { ...type.cardTitle, color: colors.foreground },
  meta: { ...type.meta, color: colors.mutedForeground },
});
