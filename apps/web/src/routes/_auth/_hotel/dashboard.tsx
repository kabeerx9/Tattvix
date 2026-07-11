import { Button } from "@tattvix/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BedDouble, Building2, CalendarDays, Users } from "lucide-react";

import { PageHeader, Surface } from "@/components/design-system";

export const Route = createFileRoute("/_auth/_hotel/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const currentUser = Route.useRouteContext().auth.currentUser;
  const membership = currentUser?.memberships[0];
  const name = currentUser?.firstName || currentUser?.username || "there";

  return (
    <div className="mx-auto grid max-w-[1360px] gap-8">
      <PageHeader
        eyebrow={membership ? formatRole(membership.role) : "Hotel workspace"}
        title={`Welcome, ${name}`}
        description={
          membership
            ? `${membership.organization.name} is connected and ready for its first operational records.`
            : "Your hotel workspace is ready."
        }
      />

      {membership ? (
        <Surface className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Building2 className="size-5" />
            </span>
            <div>
              <p className="text-base font-semibold">{membership.organization.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {membership.properties.length === 1
                  ? membership.properties[0]?.name
                  : `${membership.properties.length} properties available`}
              </p>
            </div>
          </div>
          <span className="w-fit rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
            {membership.hasAllProperties ? "All properties" : "Limited property access"}
          </span>
        </Surface>
      ) : null}

      <Surface>
        <div className="border-b px-6 py-5">
          <p className="text-base font-semibold">Operations overview</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Real activity will appear here as reservations, rooms, and guests are added.
          </p>
        </div>
        <div className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          <EmptyOperation
            icon={CalendarDays}
            title="No reservations yet"
            description="Create or import the first booking to begin tracking arrivals."
            to="/reservations"
          />
          <EmptyOperation
            icon={BedDouble}
            title="No rooms configured"
            description="Add room inventory before assigning stays and availability."
            to="/rooms"
          />
          <EmptyOperation
            icon={Users}
            title="No guest records"
            description="Guest profiles will appear when the first reservation is created."
            to="/guests"
          />
        </div>
      </Surface>

      <Surface className="grid min-h-64 place-items-center p-8 text-center">
        <div className="max-w-md">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted">
            <CalendarDays className="size-5" />
          </span>
          <h2 className="mt-5 text-lg font-semibold">No operational activity yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Once real hotel workflows are connected, this area will show arrivals,
            departures, occupancy, and tasks without placeholder data.
          </p>
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
  to: "/reservations" | "/rooms" | "/guests";
}) {
  return (
    <div className="flex flex-col items-start p-6">
      <span className="grid size-10 place-items-center rounded-xl bg-muted">
        <Icon className="size-5" />
      </span>
      <h2 className="mt-5 text-sm font-semibold">{title}</h2>
      <p className="mt-2 flex-1 text-xs leading-5 text-muted-foreground">{description}</p>
      <Button className="mt-5" variant="ghost" render={<Link to={to} />}>
        Open {to.slice(1)}
      </Button>
    </div>
  );
}

function formatRole(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
