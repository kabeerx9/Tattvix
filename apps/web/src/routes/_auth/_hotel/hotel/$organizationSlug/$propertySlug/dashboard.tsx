import { Button } from "@tattvix/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BedDouble, CalendarDays, Users } from "lucide-react";

import { PageHeader, Surface } from "@/components/design-system";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/dashboard",
)({
  component: PropertyDashboardPage,
});

function PropertyDashboardPage() {
  const { activeMembership, activeProperty } = Route.useRouteContext();

  return (
    <div className="mx-auto grid max-w-[1360px] gap-8">
      <PageHeader
        eyebrow={activeMembership.organization.name}
        title={activeProperty.name}
        description="Property operations will appear here as real reservations, rooms, and guests are added."
      />

      <Surface>
        <div className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          <EmptyOperation
            icon={CalendarDays}
            title="No reservations yet"
            description="Create or import the first booking to begin tracking arrivals."
            to="/hotel/$organizationSlug/$propertySlug/reservations"
          />
          <EmptyOperation
            icon={BedDouble}
            title="No rooms configured"
            description="Add room inventory before assigning stays and availability."
            to="/hotel/$organizationSlug/$propertySlug/rooms"
          />
          <EmptyOperation
            icon={Users}
            title="No guest records"
            description="Guest profiles will appear when the first reservation is created."
            to="/hotel/$organizationSlug/$propertySlug/guests"
          />
        </div>
      </Surface>
    </div>
  );
}

function EmptyOperation({
  icon: Icon,
  title,
  description,
  to,
}: {
  icon: typeof CalendarDays;
  title: string;
  description: string;
  to:
    | "/hotel/$organizationSlug/$propertySlug/reservations"
    | "/hotel/$organizationSlug/$propertySlug/rooms"
    | "/hotel/$organizationSlug/$propertySlug/guests";
}) {
  const params = Route.useParams();

  return (
    <div className="flex flex-col items-start p-6">
      <span className="grid size-10 place-items-center rounded-xl bg-muted">
        <Icon className="size-5" />
      </span>
      <h2 className="mt-5 text-sm font-semibold">{title}</h2>
      <p className="mt-2 flex-1 text-xs leading-5 text-muted-foreground">{description}</p>
      <Button
        className="mt-5"
        variant="ghost"
        render={<Link to={to} params={params} />}
      >
        Open workspace
      </Button>
    </div>
  );
}
