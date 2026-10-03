import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@tattvix/ui/components/button";
import { PageHeader, Panel, PanelHeader, PanelSection, FactsRow, Fact, StatusPill } from "@/components/design-system";
import { formatMoneyMinor } from "@/lib/money";
import { guestStayQueries } from "../queries";
import { guestStayStatusLabel } from "../status";

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
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        title={stay.property.name}
        meta={<StatusPill tone={stay.operationalStatus === "PENDING_CHECK_IN" ? "warning" : stay.operationalStatus === "CHECKED_IN" ? "success" : "neutral"}>{guestStayStatusLabel(stay.operationalStatus)}</StatusPill>}
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
      <FactsRow>
        <Fact label="Room" value={stay.room?.number ?? "Awaiting assignment"} />
        <Fact label="Submitted" value={stay.submittedAt ? new Date(stay.submittedAt).toLocaleString() : "—"} />
        {stay.checkedInAt ? <Fact label="Checked in" value={new Date(stay.checkedInAt).toLocaleString()} /> : null}
        {stay.checkedOutAt ? <Fact label="Checked out" value={new Date(stay.checkedOutAt).toLocaleString()} /> : null}
        {bill?.roomNights != null ? <Fact label="Nights" value={bill.roomNights} detail={`at ${formatMoneyMinor(bill.nightlyRateMinor ?? 0)} per night`} /> : null}
      </FactsRow>
      {stay.operationalStatus === "PENDING_CHECK_IN" ? <p className="text-xs text-subtle-foreground">Your request was sent. Reception will assign a room and confirm its charge.</p> : null}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
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
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-muted text-left text-xs text-subtle-foreground"><tr><th className="px-5 py-3 font-medium">Item</th><th className="px-5 py-3 text-right font-medium tabular-nums">Qty</th><th className="px-5 py-3 text-right font-medium tabular-nums">Unit</th><th className="px-5 py-3 text-right font-medium tabular-nums">Amount</th></tr></thead>
                <tbody>
                  {bill.items.length ? bill.items.map((item) => (
                    <tr key={item.id} className={`h-[52px] border-t border-border-soft ${item.voidedAt ? "text-subtle-foreground" : ""}`}>
                      <td className="px-5 py-2"><p className={item.voidedAt ? "line-through" : "font-medium"}>{item.description}</p>{item.voidedAt ? <p className="mt-1 text-xs">Voided: {item.voidReason}</p> : null}</td>
                      <td className="px-5 py-2 text-right tabular-nums">{item.quantity}</td>
                      <td className={`px-5 py-2 text-right tabular-nums ${item.voidedAt ? "line-through" : ""}`}>{formatMoneyMinor(item.unitPriceMinor)}</td>
                      <td className={`px-5 py-2 text-right font-medium tabular-nums ${item.voidedAt ? "line-through" : ""}`}>{formatMoneyMinor(item.lineTotalMinor)}</td>
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
      <Panel><PanelHeader title="Identity sharing" /><PanelSection className="grid gap-3">
        <StatusPill tone={stay.status === "REVOKED" ? "danger" : stay.status === "CLOSED" ? "neutral" : "success"}>{stay.status === "REVOKED" ? "Consent revoked" : stay.status === "CLOSED" ? "Identity review complete" : "Consent approved"}</StatusPill>
        {stay.hotelAccessExpiresAt ? <p className="text-xs text-subtle-foreground">Access ends no later than {new Date(stay.hotelAccessExpiresAt).toLocaleString()}</p> : null}
      </PanelSection><PanelSection className="grid gap-4">
        <div>
          <p className="mt-1 text-sm text-muted-foreground">
            {stay.status === "REVOKED"
              ? "You revoked identity access. Your stay and bill remain available."
              : "Manage hotel identity access separately from your stay and bill."}
          </p>
        </div>
        <Button
          nativeButton={false}
          variant="outline"
          render={<Link to="/privacy" />}
        >
          Privacy center
        </Button>
      </PanelSection></Panel>
      </div>
    </div>
  );
}
