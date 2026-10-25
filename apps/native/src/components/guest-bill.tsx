// The guest's read-only bill for one stay: line items, voided charges struck
// through with their reason, the total and the bill status. The desk writes
// charges; a guest only reads them. Polls until the bill is final.
import { formatMoneyMinor } from "@tattvix/api";
import type { GuestShare, StayBill } from "@tattvix/contracts";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";

import { Button, Card, Spinner, StatusPill, colors, radii, space, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";

type BillItem = StayBill["items"][number];

export function GuestBill({ stay }: { stay: Pick<GuestShare, "id" | "operationalStatus"> }) {
  const bill = useQuery({
    ...queries.guestStays.bill(stay.id),
    refetchInterval: (query) => (query.state.data?.isFinal ? false : 5000),
  });
  const data = bill.data;
  const waiting = stay.operationalStatus === "PENDING_CHECK_IN";

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Your bill</Text>
        {data ? <StatusPill tone={data.isFinal ? "neutral" : "success"}>{data.isFinal ? "Final" : "Open"}</StatusPill> : null}
      </View>
      <Text style={styles.meta}>
        {waiting
          ? "The hotel will confirm the room charge at check-in."
          : data?.isFinal
            ? "Finalised at checkout."
            : "Hotel charges appear here as your stay continues."}
      </Text>

      {bill.isPending ? (
        <View style={styles.center}>
          <Spinner color={colors.mutedForeground} />
        </View>
      ) : null}

      {bill.isError && !data ? (
        <View style={styles.stateRow}>
          <Text style={styles.meta}>The bill could not be loaded.</Text>
          <Button label={bill.isFetching ? "Retrying" : "Try again"} variant="outline" size="sm" loading={bill.isFetching} onPress={() => void bill.refetch()} />
        </View>
      ) : null}

      {data ? (
        <View style={styles.stack}>
          {data.items.length ? (
            <View>
              {data.items.map((item) => (
                <BillRow key={item.id} item={item} />
              ))}
            </View>
          ) : (
            <Text style={styles.quiet}>No charges recorded yet.</Text>
          )}

          {waiting ? null : (
            <View style={styles.summary}>
              <View style={styles.totalRow}>
                <Text style={styles.label}>Bill total</Text>
                <Text style={styles.total}>{formatMoneyMinor(data.totalMinor)}</Text>
              </View>
            </View>
          )}

          <Text style={styles.meta}>This is your itemised stay bill. Payment is arranged directly with the hotel.</Text>
        </View>
      ) : null}
    </Card>
  );
}

function BillRow({ item }: { item: BillItem }) {
  const voided = Boolean(item.voidedAt);
  const muted = voided ? { color: colors.mutedForeground, textDecorationLine: "line-through" as const } : null;
  return (
    <View style={styles.item}>
      <View style={styles.itemCopy}>
        <View style={styles.itemHead}>
          <Text style={[styles.itemTitle, muted]} numberOfLines={2}>
            {item.description}
          </Text>
          {voided ? <StatusPill tone="destructive">Voided</StatusPill> : null}
        </View>
        <Text style={[styles.meta, muted]}>{`${item.quantity} × ${formatMoneyMinor(item.unitPriceMinor)}`}</Text>
        {voided ? <Text style={styles.meta}>{`Voided: ${item.voidReason}`}</Text> : null}
      </View>
      <Text style={[styles.amount, muted]}>{formatMoneyMinor(item.lineTotalMinor)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  title: { ...type.cardTitle, color: colors.foreground, flex: 1 },
  center: { alignItems: "center", paddingVertical: space.xl },
  stateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  stack: { gap: space.md },
  quiet: { ...type.meta, color: colors.mutedForeground, backgroundColor: colors.muted, padding: space.lg, borderRadius: radii.card },
  meta: { ...type.meta, color: colors.mutedForeground },
  label: { ...type.rowTitle, color: colors.foreground },
  item: { flexDirection: "row", alignItems: "flex-start", gap: space.md, paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSoft },
  itemCopy: { flex: 1, gap: 2 },
  itemHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  itemTitle: { ...type.rowTitle, color: colors.foreground, flexShrink: 1 },
  amount: { ...type.rowTitle, color: colors.foreground, fontVariant: ["tabular-nums"] },
  summary: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: space.md },
  totalRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  total: { ...type.sectionTitle, color: colors.foreground, fontVariant: ["tabular-nums"] },
});
