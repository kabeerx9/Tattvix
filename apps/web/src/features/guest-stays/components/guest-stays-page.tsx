import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@tattvix/ui/components/button";
import { Hotel } from "lucide-react";
import { EmptyState, PageHeader, Surface } from "@/components/design-system";
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
        eyebrow="Personal account"
        title="My stays"
        description="Track reception confirmation, your room and your itemized hotel bill."
      />
      {query.isPending ? (
        <Surface className="p-6">
          <p role="status">Loading your stays...</p>
        </Surface>
      ) : query.isError ? (
        <Surface className="p-6">
          <p role="alert">Your stays could not be loaded.</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            Try again
          </Button>
        </Surface>
      ) : !query.data.stays.length ? (
        <Surface>
          <EmptyState
            icon={Hotel}
            title="No stays yet"
            description="Scan the hotel’s QR and send your check-in request. Your stay and bill will appear here."
          />
        </Surface>
      ) : (
        query.data.stays.map((stay) => (
          <Surface
            key={stay.id}
            className="flex flex-wrap items-center justify-between gap-4 p-5"
          >
            <div>
              <h2 className="text-lg font-semibold">{stay.property.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {guestStayStatusLabel(stay.operationalStatus)}
                {stay.room ? ` · Room ${stay.room.number}` : ""}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {stay.submittedAt
                  ? new Date(stay.submittedAt).toLocaleDateString()
                  : "Check-in request submitted"}
              </p>
            </div>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link to="/stays/$stayId" params={{ stayId: stay.id }} />}
            >
              View stay & bill
            </Button>
          </Surface>
        ))
      )}
    </div>
  );
}
