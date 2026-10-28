import type { OperationalStayStatus } from "@tattvix/contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@tattvix/ui/components/button";
import { Hotel, ChevronRight } from "lucide-react";
import { EmptyState, Kpi, KpiStrip, PageCover, PageHeader, Panel, PanelHeader, StatusPill } from "@/components/design-system";
import { travelImages } from "@/lib/travel-images";
import { checkInQueries } from "@/features/check-in/queries";
import { stayStatusLabel } from "../status";

export function GuestStaysPage() {
  const query = useQuery({
    ...checkInQueries.shares(),
    refetchInterval: 30_000,
  });
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        title="My stays"
      />
      <PageCover src={travelImages.stays} />
      {query.isPending ? (
        <Panel className="p-6">
          <p role="status">Loading your stays...</p>
        </Panel>
      ) : query.isError ? (
        <Panel className="p-6">
          <p role="alert">Your stays could not be loaded.</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            Try again
          </Button>
        </Panel>
      ) : !query.data.stays.length ? (
        <Panel>
          <EmptyState
            icon={Hotel}
            title="No stays yet"
            description="Scan the hotel’s QR and send your check-in request. Your stay and bill will appear here."
          />
        </Panel>
      ) : (
        <>
          <KpiStrip>
            <Kpi label="Waiting for a room" value={query.data.stays.filter((stay) => stay.operationalStatus === "PENDING_CHECK_IN").length} />
            <Kpi label="Checked in" value={query.data.stays.filter((stay) => stay.operationalStatus === "CHECKED_IN").length} />
            <Kpi label="Checked out" value={query.data.stays.filter((stay) => stay.operationalStatus === "CHECKED_OUT").length} />
          </KpiStrip>
          <Panel>
            <PanelHeader title="Stays" icon={Hotel} meta={query.data.stays.length} />
            {query.data.stays.map((stay) => (
              <Link key={stay.id} to="/stays/$stayId" params={{ stayId: stay.id }} className="flex min-h-11 items-center gap-3 border-t border-border-soft px-5 py-3 first:border-t-0 hover:bg-muted/50">
                <Hotel aria-hidden className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold [overflow-wrap:anywhere]">{stay.property.name}</h2>
                  <p className="mt-1 text-xs text-subtle-foreground [overflow-wrap:anywhere]">{stay.room ? `Room ${stay.room.number} · ` : ""}{stay.submittedAt ? new Date(stay.submittedAt).toLocaleDateString() : "Check-in request submitted"}</p>
                  {/* On phones the pill sits under the name so the name keeps the row's width. */}
                  <span className="mt-2 flex sm:hidden"><StayStatusPill status={stay.operationalStatus} /></span>
                </div>
                <span className="hidden shrink-0 sm:flex"><StayStatusPill status={stay.operationalStatus} /></span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </Panel>
        </>
      )}
    </div>
  );
}

function StayStatusPill({ status }: { status: OperationalStayStatus }) {
  return (
    <StatusPill tone={status === "PENDING_CHECK_IN" ? "warning" : status === "CHECKED_IN" ? "success" : "neutral"}>
      {stayStatusLabel(status)}
    </StatusPill>
  );
}
