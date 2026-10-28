import { GuestReviewSection } from "@/features/reviews/guest-review-section";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@tattvix/ui/components/button";
import { getGuestAccessSummary, getGuestStayFacts } from "@tattvix/api";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { cn } from "@tattvix/ui/lib/utils";
import { FactList, ListRow, PageHeader, Panel, PanelHeader, PanelSection, StatusPill } from "@/components/design-system";
import { formatMoneyMinor } from "@/lib/money";
import { getGuestAccessAction } from "../access";
import { guestStayQueries } from "../queries";
import { stayStatusLabel } from "../status";

export function GuestStayDetailPage({ stayId }: { stayId: string }) {
  const stayQuery = useQuery({
    ...guestStayQueries.detail(stayId),
    refetchInterval: (query) =>
      query.state.data?.operationalStatus === "CHECKED_OUT" ? false : 5000,
  });
  const billQuery = useQuery({
    ...guestStayQueries.bill(stayId),
    enabled: Boolean(stayQuery.data),
    refetchInterval: (query) => (query.state.data?.isFinal ? false : 5000),
  });
  const stay = stayQuery.data;
  if (stayQuery.isPending)
    return (
      <Panel className="p-6">
        <p role="status">Loading your stay...</p>
      </Panel>
    );
  if (!stay || stayQuery.isError)
    return (
      <Panel className="p-6">
        <p role="alert">
          This stay could not be loaded. It may not belong to this account.
        </p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => void stayQuery.refetch()}
        >
          Try again
        </Button>
        <Link to="/stays" className="ml-4 text-sm underline">
          Back to my stays
        </Link>
      </Panel>
    );
  const bill = billQuery.data;
  const sharing = getGuestAccessSummary(getGuestAccessAction(stay));
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <PageHeader
        title={stay.property.name}
        meta={<StatusPill tone={stay.operationalStatus === "PENDING_CHECK_IN" ? "warning" : stay.operationalStatus === "CHECKED_IN" ? "success" : "neutral"}>{stayStatusLabel(stay.operationalStatus)}</StatusPill>}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link to="/stays" />}
          >
            All stays
          </Button>
        }
      />
      {stay.operationalStatus === "PENDING_CHECK_IN" ? <p className="text-sm text-muted-foreground">Reception will assign your room and confirm its charge.</p> : null}
      <Panel>
        <FactList facts={getGuestStayFacts(stay, bill)} />
      </Panel>
      {stay.operationalStatus === "CHECKED_OUT" ? <GuestReviewSection key={stay.id} stayId={stay.id} /> : null}
      <Panel className="overflow-hidden">
        <PanelHeader title="Your bill" meta={bill ? <StatusPill tone={bill.isFinal ? "neutral" : "success"}>{bill.isFinal ? "Final" : "Open"}</StatusPill> : undefined} actions={
          <Button size="sm" variant="outline" disabled={billQuery.isFetching} onClick={() => void billQuery.refetch()}>Refresh bill</Button>
        } />
        <PanelSection className="text-xs text-subtle-foreground">{stay.operationalStatus === "PENDING_CHECK_IN" ? "The hotel will confirm the room charge at check-in." : bill?.isFinal ? "Finalized at checkout." : "Hotel charges appear here as your stay continues."}</PanelSection>
        {billQuery.isPending ? (
          <p className="p-6" role="status">
            Loading charges...
          </p>
        ) : billQuery.isError ? (
          <div className="p-6" role="alert">
            <p>The bill could not be loaded.</p>
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => void billQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : bill ? (
          <>
            <div className="overflow-x-auto">
              {/* Phones get Item + Amount only (qty × unit moves under the item) so amounts never sit off-screen. */}
              <table className="w-full text-sm sm:min-w-[480px]">
                <thead className="bg-muted text-left text-xs text-subtle-foreground"><tr><th className="px-5 py-3 font-medium">Item</th><th className="hidden px-5 py-3 text-right font-medium tabular-nums sm:table-cell">Qty</th><th className="hidden px-5 py-3 text-right font-medium tabular-nums sm:table-cell">Unit</th><th className="px-5 py-3 text-right font-medium tabular-nums">Amount</th></tr></thead>
                <tbody>
                  {bill.items.length ? bill.items.map((item) => (
                    <tr key={item.id} className={`h-[52px] border-t border-border-soft ${item.voidedAt ? "text-subtle-foreground" : ""}`}>
                      <td className="px-5 py-2 [overflow-wrap:anywhere]"><p className={item.voidedAt ? "line-through" : "font-medium"}>{item.description}</p><p className="mt-1 text-xs text-subtle-foreground tabular-nums sm:hidden">{item.quantity} × {formatMoneyMinor(item.unitPriceMinor)}</p>{item.voidedAt ? <p className="mt-1 text-xs">Voided: {item.voidReason}</p> : null}</td>
                      <td className="hidden px-5 py-2 text-right tabular-nums sm:table-cell">{item.quantity}</td>
                      <td className={`hidden px-5 py-2 text-right tabular-nums sm:table-cell ${item.voidedAt ? "line-through" : ""}`}>{formatMoneyMinor(item.unitPriceMinor)}</td>
                      <td className={`px-5 py-2 text-right font-medium whitespace-nowrap tabular-nums ${item.voidedAt ? "line-through" : ""}`}>{formatMoneyMinor(item.lineTotalMinor)}</td>
                    </tr>
                  )) : <tr><td colSpan={4} className="px-5 py-5 text-muted-foreground">No charges recorded yet.</td></tr>}
                </tbody>
              </table>
            </div>
            {stay.operationalStatus !== "PENDING_CHECK_IN" && (
              <div className="flex items-center justify-between border-t border-border-soft p-5">
                <span className="font-semibold">Bill total</span>
                <span className="text-xl font-semibold tabular-nums">
                  {formatMoneyMinor(bill.totalMinor)}
                </span>
              </div>
            )}
            <p className="px-6 py-4 text-xs text-muted-foreground">
              This is your itemized stay bill. Payment is arranged directly with
              the hotel.
            </p>
          </>
        ) : null}
      </Panel>
      <Panel>
        <Link
          to="/privacy"
          className="block px-5 py-3.5 outline-none transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <ListRow
            leading={<ShieldCheck aria-hidden className="size-5" strokeWidth={1.75} />}
            title={<span className="text-[15px] font-semibold">ID sharing</span>}
            meta={<span className={cn("text-sm", sharing.open ? "text-success" : "text-muted-foreground")}>{sharing.text}</span>}
            trailing={<ChevronRight aria-hidden className="size-4 text-subtle-foreground" />}
          />
        </Link>
      </Panel>
    </div>
  );
}
