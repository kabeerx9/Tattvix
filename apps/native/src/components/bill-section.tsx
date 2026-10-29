// The stay's bill on the stay screen: line items, the running total and, while
// the stay is in house, the desk's two bill writes (add an extra, void an
// extra). Charges are idempotent: a request id is kept across a network
// failure so a retry cannot double-post, and dropped on a definite rejection.
import { formatMoneyMinor, parseMoneyMinor } from "@tattvix/api";
import { ApiError, type HotelStayDetail, type StayBill } from "@tattvix/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BottomSheet, Button, Card, Spinner, StatusPill, TextField, TextLink, colors, radii, space, toast, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import type { ManageScope } from "@/src/lib/desk-scope";
import { errorMessage } from "@/src/lib/format";
import { hotelMutations } from "@/src/lib/hotel-mutations";
import { randomUuid } from "@/src/lib/uuid";

type BillItem = StayBill["items"][number];

export function BillSection({ scope, stayId, stay }: { scope: ManageScope; stayId: string; stay: HotelStayDetail }) {
  const bill = useQuery(queries.hotelStays.bill(scope.organizationSlug, scope.propertySlug, stayId));
  const [addOpen, setAddOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<BillItem | null>(null);

  const data = bill.data;
  // The server closes the bill at checkout, so a checked-out stay is final whatever the cached flag says.
  const isFinal = (data?.isFinal ?? false) || stay.operationalStatus !== "CHECKED_IN";
  const canWrite = scope.canManageBill && !isFinal;

  const roomTotal = data?.items.filter((item) => item.kind === "ROOM" && !item.voidedAt).reduce((sum, item) => sum + item.lineTotalMinor, 0) ?? 0;
  const extrasTotal = data?.items.filter((item) => item.kind === "EXTRA" && !item.voidedAt).reduce((sum, item) => sum + item.lineTotalMinor, 0) ?? 0;

  function openVoid(item: BillItem) {
    setVoidTarget(item);
    setVoidOpen(true);
  }

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Bill</Text>
        {data ? <StatusPill tone={data.isFinal ? "neutral" : "success"}>{data.isFinal ? "Final" : "Open"}</StatusPill> : null}
      </View>

      {bill.isPending ? (
        <View style={styles.center}>
          <Spinner color={colors.mutedForeground} />
        </View>
      ) : null}

      {bill.isError && !data ? (
        <View style={styles.stateRow}>
          <Text style={styles.meta}>The bill could not be loaded.</Text>
          <Button label={bill.isFetching ? "Retrying" : "Retry"} variant="outline" size="sm" loading={bill.isFetching} onPress={() => void bill.refetch()} />
        </View>
      ) : null}

      {data ? (
        <View style={styles.stack}>
          {data.items.length ? (
            <View>
              {data.items.map((item) => (
                <BillRow key={item.id} item={item} onVoid={canWrite && item.kind === "EXTRA" && !item.voidedAt ? () => openVoid(item) : undefined} />
              ))}
            </View>
          ) : (
            <Text style={styles.quiet}>No charges yet.</Text>
          )}

          {canWrite ? <TextLink label="Add charge" onPress={() => setAddOpen(true)} /> : null}

          <View style={styles.summary}>
            <Text style={styles.meta}>
              Room {formatMoneyMinor(roomTotal)} + extras {formatMoneyMinor(extrasTotal)}
            </Text>
            <View style={styles.totalRow}>
              <Text style={styles.label}>Total</Text>
              <Text style={styles.total}>{formatMoneyMinor(data.totalMinor)}</Text>
            </View>
            {!data.isFinal ? <Text style={styles.meta}>Checking out finalises this bill.</Text> : null}
          </View>
        </View>
      ) : null}

      {canWrite ? <AddChargeSheet scope={scope} stayId={stayId} open={addOpen} onClose={() => setAddOpen(false)} /> : null}
      {canWrite && voidTarget ? <VoidSheet scope={scope} stayId={stayId} item={voidTarget} open={voidOpen} onClose={() => setVoidOpen(false)} /> : null}
    </Card>
  );
}

function BillRow({ item, onVoid }: { item: BillItem; onVoid?: () => void }) {
  const voided = Boolean(item.voidedAt);
  const muted = voided ? { color: colors.mutedForeground, textDecorationLine: "line-through" as const } : null;
  return (
    <View style={styles.item}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.itemHead}>
          <Text style={[styles.itemTitle, muted]} numberOfLines={2}>
            {item.description}
          </Text>
          {voided ? <StatusPill tone="destructive">Void</StatusPill> : null}
        </View>
        <Text style={[styles.meta, muted]}>{`${item.quantity} × ${formatMoneyMinor(item.unitPriceMinor)}`}</Text>
        {voided ? <Text style={styles.meta}>{`Void: ${item.voidReason}`}</Text> : null}
      </View>
      <View style={styles.amountCol}>
        <Text style={[styles.amount, muted]}>{formatMoneyMinor(item.lineTotalMinor)}</Text>
        {onVoid ? <Button label="Void" variant="ghost" size="sm" onPress={onVoid} /> : null}
      </View>
    </View>
  );
}

function AddChargeSheet({ scope, stayId, open, onClose }: { scope: ManageScope; stayId: string; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const addCharge = useMutation(hotelMutations.addBillCharge(queryClient));
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  // Kept across retries of the same charge; see the file header.
  const requestId = useRef<string | null>(null);

  const trimmed = description.trim();
  const quantityValue = Number(quantity);
  const quantityOk = /^\d+$/.test(quantity.trim()) && quantityValue >= 1 && quantityValue <= 9999;
  const unitPriceMinor = parseMoneyMinor(unitPrice.trim());
  const valid = trimmed.length > 0 && trimmed.length <= 200 && quantityOk && unitPriceMinor !== null;

  function submit() {
    if (!valid || unitPriceMinor === null) return;
    requestId.current ??= randomUuid();
    addCharge.mutate(
      {
        organizationSlug: scope.organizationSlug,
        propertySlug: scope.propertySlug,
        stayId,
        input: { requestId: requestId.current, description: trimmed, quantity: quantityValue, unitPriceMinor },
      },
      {
        onSuccess: () => {
          requestId.current = null;
          setDescription("");
          setQuantity("1");
          setUnitPrice("");
          addCharge.reset();
          toast("Extra added to the bill");
          onClose();
        },
        onError: (error) => {
          // A definite rejection is safe to correct; an ambiguous network failure must reuse its id.
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            requestId.current = null;
            void queryClient.invalidateQueries({ queryKey: queries.hotelStays.bill(scope.organizationSlug, scope.propertySlug, stayId).queryKey });
          }
        },
      },
    );
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Add charge"
      footer={<Button label={addCharge.isPending ? "Adding" : "Add to bill"} onPress={submit} loading={addCharge.isPending} disabled={!valid} />}
    >
      <View style={styles.sheetStack}>
        <TextField label="Description" placeholder="Minibar, laundry, late checkout" value={description} onChangeText={setDescription} maxLength={200} enter="next" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextField label="Quantity" inputMode="numeric" value={quantity} onChangeText={setQuantity} maxLength={4} enter="next" />
          </View>
          <View style={{ flex: 2 }}>
            <TextField
              label="Unit price (INR)"
              placeholder="250.00"
              inputMode="decimal"
              value={unitPrice}
              onChangeText={setUnitPrice}
              enter={submit}
              error={unitPrice.trim() && unitPriceMinor === null ? "Enter an amount in rupees" : undefined}
            />
          </View>
        </View>
        <ErrorText message={addCharge.isError ? errorMessage(addCharge.error, "The charge could not be added.") : null} />
      </View>
    </BottomSheet>
  );
}

function VoidSheet({ scope, stayId, item, open, onClose }: { scope: ManageScope; stayId: string; item: BillItem; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const voidItem = useMutation(hotelMutations.voidBillItem(queryClient));
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();

  function submit() {
    if (!trimmed) return;
    voidItem.mutate(
      { organizationSlug: scope.organizationSlug, propertySlug: scope.propertySlug, stayId, itemId: item.id, input: { reason: trimmed } },
      {
        onSuccess: () => {
          setReason("");
          voidItem.reset();
          toast("Extra voided on the bill");
          onClose();
        },
      },
    );
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Void charge"
      footer={
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Button label="Keep charge" variant="ghost" onPress={onClose} disabled={voidItem.isPending} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Void extra" variant="destructive" onPress={submit} loading={voidItem.isPending} disabled={!trimmed} />
          </View>
        </View>
      }
    >
      <View style={styles.sheetStack}>
        <Text style={styles.meta}>{`${item.description} · ${formatMoneyMinor(item.lineTotalMinor)}`}</Text>
        <TextField label="Reason" placeholder="Added by mistake" value={reason} onChangeText={setReason} maxLength={500} autoFocus />
        <ErrorText message={voidItem.isError ? errorMessage(voidItem.error, "The charge could not be voided.") : null} />
      </View>
    </BottomSheet>
  );
}

function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.lg },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm, marginBottom: space.md },
  title: { ...type.cardTitle, color: colors.foreground, flex: 1 },
  center: { alignItems: "center", paddingVertical: space.xl },
  stateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  stack: { gap: space.md },
  sheetStack: { gap: space.lg, paddingTop: space.sm },
  row: { flexDirection: "row", gap: space.sm },
  quiet: { ...type.meta, color: colors.mutedForeground, backgroundColor: colors.muted, padding: space.lg, borderRadius: radii.card },
  meta: { ...type.meta, color: colors.mutedForeground },
  label: { ...type.rowTitle, color: colors.foreground },
  item: { flexDirection: "row", alignItems: "flex-start", gap: space.md, paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSoft },
  itemHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  itemTitle: { ...type.rowTitle, color: colors.foreground, flexShrink: 1 },
  amountCol: { alignItems: "flex-end", gap: space.xs },
  amount: { ...type.rowTitle, color: colors.foreground, fontVariant: ["tabular-nums"] },
  summary: { gap: space.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: space.md },
  totalRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  total: { ...type.sectionTitle, color: colors.foreground, fontVariant: ["tabular-nums"] },
  error: { ...type.meta, color: colors.destructive },
});
