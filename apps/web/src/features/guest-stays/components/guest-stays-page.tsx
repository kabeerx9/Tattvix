import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@tattvix/ui/components/button";
import { Hotel, Clock3, BedDouble, LogOut, ChevronRight } from "lucide-react";
import { EmptyState, PageHeader, Panel, PanelHeader, StatusPill, KpiStrip, Kpi } from "@/components/design-system";
import { checkInQueries } from "@/features/check-in/queries";
import { guestStayStatusLabel } from "../status";

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
            <Kpi icon={Clock3} label="Waiting for a room" value={query.data.stays.filter((stay) => stay.operationalStatus === "PENDING_CHECK_IN").length} />
            <Kpi icon={BedDouble} label="In house" value={query.data.stays.filter((stay) => stay.operationalStatus === "CHECKED_IN").length} />
            <Kpi icon={LogOut} label="Checked out" value={query.data.stays.filter((stay) => stay.operationalStatus === "CHECKED_OUT").length} />
          </KpiStrip>
          <Panel>
            <PanelHeader title="Stays" icon={Hotel} meta={query.data.stays.length} />
            {query.data.stays.map((stay) => (
              <Link key={stay.id} to="/stays/$stayId" params={{ stayId: stay.id }} className="flex min-h-11 flex-wrap items-center gap-3 border-t border-border-soft px-5 py-3 first:border-t-0 hover:bg-muted/50">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><Hotel className="size-[18px]" /></span>
                <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">{stay.property.name}</h2><p className="mt-1 text-xs text-subtle-foreground">{stay.room ? `Room ${stay.room.number} · ` : ""}{stay.submittedAt ? new Date(stay.submittedAt).toLocaleDateString() : "Check-in request submitted"}</p></div>
                <StatusPill tone={stay.operationalStatus === "PENDING_CHECK_IN" ? "warning" : stay.operationalStatus === "CHECKED_IN" ? "success" : "neutral"}>{guestStayStatusLabel(stay.operationalStatus)}</StatusPill>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </Panel>
        </>
      )}
    </div>
  );
}
