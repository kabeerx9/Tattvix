import { Button } from "@tattvix/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BedDouble, ClipboardCheck, Users } from "lucide-react";

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
        description="Start secure walk-in check-ins, review submitted guest identity, and prepare the property for room operations."
      />

      <Surface>
        <div className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          <EmptyOperation
            icon={ClipboardCheck}
            title="No stays submitted yet"
            description="Generate the property QR to start the first consent-based check-in."
            to="/hotel/$organizationSlug/$propertySlug/stays"
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
            description="Guest records will appear after the first identity package is submitted."
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
  icon: typeof ClipboardCheck;
  title: string;
  description: string;
  to:
    | "/hotel/$organizationSlug/$propertySlug/stays"
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
