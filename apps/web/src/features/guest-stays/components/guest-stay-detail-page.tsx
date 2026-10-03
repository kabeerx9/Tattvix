import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@tattvix/ui/components/button";
import { PageHeader, Surface } from "@/components/design-system";
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
      <Surface className="p-6">
        <p role="status">Loading your stay...</p>
      </Surface>
    );
  if (!stay || stayQuery.isError)
    return (
      <Surface className="p-6">
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
      </Surface>
    );
  const bill = billQuery.data;
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        eyebrow="My stays"
        title={stay.property.name}
        description="Your room, stay status and charges confirmed by the hotel."
        action={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link to="/stays" />}
          >
            All stays
          </Button>
        }
      />
      <Surface className="p-6">
        <p className="text-sm font-medium text-primary">
          {guestStayStatusLabel(stay.operationalStatus)}
        </p>
        <h2 className="mt-2 text-2xl font-semibold">
          {stay.room
            ? `Room ${stay.room.number}`
            : "Reception will assign your room"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {stay.operationalStatus === "PENDING_CHECK_IN"
            ? "Your request was sent. Reception will review your details, assign a room and confirm its charge."
            : stay.checkedOutAt
              ? `Checked out ${new Date(stay.checkedOutAt).toLocaleString()}`
              : stay.checkedInAt
                ? `Checked in ${new Date(stay.checkedInAt).toLocaleString()}`
                : "Confirmed by reception"}
        </p>
        {bill?.roomNights != null && (
          <p className="mt-3 text-sm">
            {bill.roomNights} {bill.roomNights === 1 ? "night" : "nights"} at{" "}
            {formatMoneyMinor(bill.nightlyRateMinor ?? 0)} per night
          </p>
        )}
      </Surface>
      <Surface className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b p-6">
          <div>
            <h2 className="text-xl font-semibold">Your bill</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {stay.operationalStatus === "PENDING_CHECK_IN"
                ? "The hotel will confirm the room charge at check-in."
                : bill?.isFinal
                  ? "Finalized at checkout."
                  : "Charges added by the hotel appear here as your stay continues."}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={billQuery.isFetching}
            onClick={() => void billQuery.refetch()}
          >
            Refresh bill
          </Button>
        </div>
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
            <div className="divide-y">
              {bill.items.length ? (
                bill.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 p-5"
                  >
                    <div>
                      <p
                        className={
                          item.voidedAt
                            ? "font-medium line-through text-muted-foreground"
                            : "font-medium"
                        }
                      >
                        {item.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.quantity} ×{" "}
                        {formatMoneyMinor(item.unitPriceMinor)}
                        {item.voidedAt ? ` · Voided: ${item.voidReason}` : ""}
                      </p>
                    </div>
                    <p
                      className={
                        item.voidedAt
                          ? "whitespace-nowrap line-through text-muted-foreground"
                          : "whitespace-nowrap font-medium"
                      }
                    >
                      {formatMoneyMinor(item.lineTotalMinor)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="p-6 text-sm text-muted-foreground">
                  No charges recorded yet.
                </p>
              )}
            </div>
            {stay.operationalStatus !== "PENDING_CHECK_IN" && (
              <div className="flex items-center justify-between border-t bg-muted/30 p-6">
                <span className="font-semibold">Bill total</span>
                <span className="text-xl font-semibold">
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
      </Surface>
      <Surface className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="font-semibold">Identity sharing</h2>
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
      </Surface>
    </div>
  );
}
