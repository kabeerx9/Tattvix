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
  IndianRupee,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Surface } from "@/components/design-system";
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
      <Surface className="p-6 text-sm text-muted-foreground">
        Loading stay bill…
      </Surface>
    );
  }
  if (billQuery.isError || !billQuery.data) {
    const message =
      billQuery.error instanceof ApiError
        ? billQuery.error.message
        : "The stay bill could not be loaded.";
    return (
      <Surface className="p-6">
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
      </Surface>
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
    <Surface className="grid gap-6 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted">
            <IndianRupee className="size-5" />
          </span>
          <div>
            <p className="app-kicker">Stay bill</p>
            <h2 className="mt-1 text-lg font-semibold">Charges and total</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Room nights are fixed at check-in. Extras remain auditable after
              they are voided.
            </p>
          </div>
        </div>
        {bill.isFinal ? (
          <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Finalized
          </span>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Charge</th>
              <th className="px-4 py-3 font-medium">Quantity</th>
              <th className="px-4 py-3 text-right font-medium">Unit price</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bill.items.map((item) => (
              <tr
                key={item.id}
                className={item.voidedAt ? "text-muted-foreground" : undefined}
              >
                <td className="px-4 py-3">
                  <p className={item.voidedAt ? "line-through" : "font-medium"}>
                    {item.description}
                  </p>
                  <p className="mt-1 text-xs">
                    {item.kind === "ROOM" ? "Room" : "Extra"}
                    {item.voidedAt
                      ? ` · Void: ${item.voidReason ?? "No reason recorded"}`
                      : ""}
                  </p>
                </td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3 text-right">
                  {formatMoneyMinor(item.unitPriceMinor)}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {item.voidedAt
                    ? formatMoneyMinor(0)
                    : formatMoneyMinor(item.lineTotalMinor)}
                </td>
                <td className="px-4 py-3 text-right">
                  {canManage &&
                  !isFinal &&
                  item.kind === "EXTRA" &&
                  !item.voidedAt ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setVoidingItem(item)}
                    >
                      <Trash2 />
                      Void
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-muted/40">
            <tr>
              <td colSpan={3} className="px-4 py-4 text-right font-semibold">
                Total
              </td>
              <td className="px-4 py-4 text-right text-base font-semibold">
                {formatMoneyMinor(bill.totalMinor)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {bill.roomNights !== null ? (
        <p className="text-xs text-muted-foreground">
          Room stay: {bill.roomNights}{" "}
          {bill.roomNights === 1 ? "night" : "nights"}
          {bill.nightlyRateMinor !== null
            ? ` at ${formatMoneyMinor(bill.nightlyRateMinor)} per night`
            : ""}
          .
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          No room charge was created for this legacy stay.
        </p>
      )}

      {canManage && !isFinal ? (
        <form className="grid gap-4 border-t pt-6" onSubmit={addExtra}>
          <div>
            <h3 className="font-semibold">Add extra</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Record an auditable additional charge while the guest is checked
              in.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px_180px_auto] md:items-end">
            <Field label="Description">
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
            <Button
              type="submit"
              disabled={!validExtra || chargeMutation.isPending}
            >
              <Plus />
              {chargeMutation.isPending ? "Adding..." : "Add extra"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="border-t pt-5 text-sm text-muted-foreground">
          {!canManage
            ? "Your role can view this bill but cannot change it."
            : "This bill can no longer be changed after checkout or finalization."}
        </p>
      )}

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
    </Surface>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
