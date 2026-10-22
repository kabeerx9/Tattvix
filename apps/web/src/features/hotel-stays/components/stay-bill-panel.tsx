import type { HotelStayDetail, StayBill } from "@tattvix/contracts";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@tattvix/ui/components/alert-dialog";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import { Textarea } from "@tattvix/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleAlert,
  Receipt,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@tattvix/ui/lib/utils";

import { ListRow, Panel, PanelHeader, PanelSection, ResponsiveTable, rowActionsRevealClassName, StatusPill } from "@/components/design-system";
import { ApiError } from "@/lib/api";
import { formatMoneyMinor, parseMoneyMinor } from "@/lib/money";

import { hotelStayMutations } from "../mutations";
import { hotelStayQueries } from "../queries";

const INITIAL_EXTRA = { description: "", quantity: "1", unitPrice: "" };

export function StayBillPanel({
  organizationSlug,
  propertySlug,
  stayId,
  stay,
  canManage,
}: {
  organizationSlug: string;
  propertySlug: string;
  stayId: string;
  stay: HotelStayDetail;
  canManage: boolean;
}) {
  const billQuery = useQuery(
    hotelStayQueries.bill(organizationSlug, propertySlug, stayId),
  );

  if (billQuery.isPending) {
    return (
      <Panel className="app-surface"><PanelSection className="text-sm text-muted-foreground">
        Loading stay bill…
      </PanelSection></Panel>
    );
  }
  if (billQuery.isError || !billQuery.data) {
    const message =
      billQuery.error instanceof ApiError
        ? billQuery.error.message
        : "The stay bill could not be loaded.";
    return (
      <Panel className="app-surface"><PanelSection>
        <p className="text-sm text-destructive">{message}</p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => billQuery.refetch()}
          disabled={billQuery.isFetching}
        >
          <RefreshCw
            className={billQuery.isFetching ? "animate-spin" : undefined}
          />
          Try again
        </Button>
      </PanelSection></Panel>
    );
  }

  return (
    <BillContents
      bill={billQuery.data}
      organizationSlug={organizationSlug}
      propertySlug={propertySlug}
      stayId={stayId}
      stay={stay}
      canManage={canManage}
    />
  );
}

function BillContents({
  bill,
  organizationSlug,
  propertySlug,
  stayId,
  stay,
  canManage,
}: {
  bill: StayBill;
  organizationSlug: string;
  propertySlug: string;
  stayId: string;
  stay: HotelStayDetail;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const chargeRequestId = useRef<string | null>(null);
  const [extra, setExtra] = useState(INITIAL_EXTRA);
  const [voidingItem, setVoidingItem] = useState<
    StayBill["items"][number] | null
  >(null);
  const [voidReason, setVoidReason] = useState("");
  const chargeMutation = useMutation(
    hotelStayMutations.addBillCharge(queryClient),
  );
  const voidMutation = useMutation(
    hotelStayMutations.voidBillItem(queryClient),
  );
  const quantity = Number(extra.quantity);
  const unitPriceMinor = parseMoneyMinor(extra.unitPrice);
  const validExtra =
    extra.description.trim().length > 0 &&
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= 9999 &&
    unitPriceMinor !== null &&
    unitPriceMinor >= 0 &&
    unitPriceMinor <= 100_000_000;
  const isFinal = bill.isFinal || stay.operationalStatus !== "CHECKED_IN";
  const mutationError = chargeMutation.error ?? voidMutation.error;
  const error =
    mutationError instanceof ApiError
      ? mutationError.message
      : mutationError
        ? "The bill could not be updated."
        : null;

  const canVoid = (item: StayBill["items"][number]) =>
    canManage && !isFinal && item.kind === "EXTRA" && !item.voidedAt;

  function addExtra(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validExtra || unitPriceMinor === null) return;
    chargeRequestId.current ??= crypto.randomUUID();
    chargeMutation.mutate(
      {
        organizationSlug,
        propertySlug,
        stayId,
        input: {
          requestId: chargeRequestId.current,
          description: extra.description.trim(),
          quantity,
          unitPriceMinor,
        },
      },
      {
        onError: (error) => {
          // A definite rejection is safe to correct; an ambiguous network failure must reuse its ID.
          if (
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500
          ) {
            chargeRequestId.current = null;
            void queryClient.invalidateQueries({
              queryKey: hotelStayQueries.bill(
                organizationSlug,
                propertySlug,
                stayId,
              ).queryKey,
            });
          }
        },
        onSuccess: () => {
          chargeRequestId.current = null;
          setExtra(INITIAL_EXTRA);
          toast.success("Extra added to the bill");
        },
      },
    );
  }

  function voidExtra() {
    if (!voidingItem || !voidReason.trim()) return;
    voidMutation.mutate(
      {
        organizationSlug,
        propertySlug,
        stayId,
        itemId: voidingItem.id,
        input: { reason: voidReason.trim() },
      },
      {
        onSuccess: () => {
          setVoidingItem(null);
          setVoidReason("");
          toast.success("Extra voided on the bill");
        },
      },
    );
  }

  return (
    <Panel className="app-surface">
      <PanelHeader
        title="Bill"
        icon={Receipt}
        meta={<StatusPill tone={bill.isFinal ? "neutral" : "success"}>{bill.isFinal ? "Final" : "Open"}</StatusPill>}
      />

      {error ? (
        <p
          role="alert"
          className="px-5 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <ResponsiveTable
        label="Bill items"
        rows={bill.items}
        getRowKey={(item) => item.id}
        switchAt="xl"
        rowClassName="min-h-[52px] py-1.5"
        columns={[
          { header: "Item", cell: (item) => <><p className={item.voidedAt ? "text-subtle-foreground line-through" : "font-medium"}>{item.description}</p><p className="mt-1 text-xs text-subtle-foreground">{billItemMeta(item)}</p></> },
          { header: "Qty", width: "48px", align: "end", className: "tabular-nums", cell: (item) => <span className={voidedClassName(item)}>{item.quantity}</span> },
          { header: "Unit", width: "110px", align: "end", className: "tabular-nums", cell: (item) => <span className={voidedClassName(item)}>{formatMoneyMinor(item.unitPriceMinor)}</span> },
          { header: "Amount", width: "120px", align: "end", className: "font-medium tabular-nums", cell: (item) => <span className={voidedClassName(item)}>{formatMoneyMinor(item.lineTotalMinor)}</span> },
          { header: "Action", width: "88px", align: "end", hideHeader: true, cell: (item) => <BillItemAction item={item} canVoid={canVoid(item)} onVoid={() => setVoidingItem(item)} /> },
        ]}
        mobileRow={(item) => (
          <ListRow
            title={<span className={item.voidedAt ? "font-normal text-subtle-foreground line-through" : undefined}>{item.description}</span>}
            badge={item.voidedAt ? <StatusPill tone="danger">Void</StatusPill> : null}
            meta={<>{item.quantity} × {formatMoneyMinor(item.unitPriceMinor)} · {billItemMeta(item)}</>}
            trailing={<span className={`font-medium ${voidedClassName(item)}`}>{formatMoneyMinor(item.lineTotalMinor)}</span>}
          >
            {canVoid(item) ? <Button size="sm" variant="outline" onClick={() => setVoidingItem(item)}><Trash2 />Void</Button> : null}
          </ListRow>
        )}
      />
      <PanelSection className="border-t border-border-soft">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="text-xs text-subtle-foreground tabular-nums">
            Room {formatMoneyMinor(bill.items.filter((item) => item.kind === "ROOM" && !item.voidedAt).reduce((sum, item) => sum + item.lineTotalMinor, 0))} + extras {formatMoneyMinor(bill.items.filter((item) => item.kind === "EXTRA" && !item.voidedAt).reduce((sum, item) => sum + item.lineTotalMinor, 0))}
          </p>
          <p className="text-2xl font-semibold tabular-nums"><span className="sr-only">Total </span>{formatMoneyMinor(bill.totalMinor)}</p>
        </div>
        {!bill.isFinal ? <p className="mt-2 text-right text-xs text-subtle-foreground">Checking out finalises this bill.</p> : null}
      </PanelSection>

      {canManage && !isFinal ? (
        <PanelSection className="border-t border-border-soft"><form className="grid gap-4" onSubmit={addExtra}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-[minmax(0,1fr)_100px_140px_auto] sm:items-end">
            <Field className="col-span-2 sm:col-span-1" label="Description">
              <Input
                required
                value={extra.description}
                maxLength={200}
                onChange={(event) =>
                  setExtra((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Airport transfer"
              />
            </Field>
            <Field label="Quantity">
              <Input
                required
                type="number"
                min="1"
                max="9999"
                value={extra.quantity}
                onChange={(event) =>
                  setExtra((current) => ({
                    ...current,
                    quantity: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Unit price (INR)">
              <Input
                required
                inputMode="decimal"
                value={extra.unitPrice}
                onChange={(event) =>
                  setExtra((current) => ({
                    ...current,
                    unitPrice: event.target.value,
                  }))
                }
                placeholder="₹500.00"
              />
            </Field>
            <Button className="col-span-2 sm:col-span-1" type="submit" variant="outline" disabled={!validExtra || chargeMutation.isPending}>
              <Plus />
              {chargeMutation.isPending ? "Adding..." : "Add charge"}
            </Button>
          </div>
        </form></PanelSection>
      ) : null}

      <AlertDialog
        open={Boolean(voidingItem)}
        onOpenChange={(open) => {
          if (!open && !voidMutation.isPending) {
            setVoidingItem(null);
            setVoidReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Void {voidingItem?.description}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Voiding retains the original charge and records why it was removed
              from the total.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="void-reason">Reason</Label>
            <Textarea
              id="void-reason"
              value={voidReason}
              onChange={(event) => setVoidReason(event.target.value)}
              maxLength={500}
              placeholder="Duplicate charge"
            />
          </div>
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={voidMutation.isPending}
              onClick={() => {
                setVoidingItem(null);
                setVoidReason("");
              }}
            >
              Keep charge
            </Button>
            <Button
              variant="destructive"
              disabled={!voidReason.trim() || voidMutation.isPending}
              onClick={voidExtra}
            >
              <CircleAlert />
              {voidMutation.isPending ? "Voiding..." : "Void extra"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}

type BillItem = StayBill["items"][number];

function billItemMeta(item: BillItem) {
  return `${item.kind === "ROOM" ? "Room" : "Extra"} · ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(item.createdAt))}${item.voidedAt ? ` · Void: ${item.voidReason ?? "No reason recorded"}` : ""}`;
}

function voidedClassName(item: BillItem) {
  return item.voidedAt ? "text-subtle-foreground line-through" : "";
}

function BillItemAction({ item, canVoid, onVoid }: { item: BillItem; canVoid: boolean; onVoid: () => void }) {
  if (item.voidedAt) return <StatusPill tone="danger">Void</StatusPill>;
  if (!canVoid) return null;
  return (
    <div className={rowActionsRevealClassName}>
      <Button size="sm" variant="ghost" onClick={onVoid}><Trash2 />Void</Button>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
