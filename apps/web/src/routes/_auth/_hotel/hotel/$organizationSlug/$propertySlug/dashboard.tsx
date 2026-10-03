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
        title="Your hotel overview"
        description={`Manage check-ins, rooms and guests at ${activeProperty.name}.`}
      />

      <Surface>
        <div className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          <OperationShortcut
            icon={ClipboardCheck}
            title="Check-ins & stays"
            description="Show your check-in QR, review submissions and manage active stays."
            actionLabel="Review check-ins"
            to="/hotel/$organizationSlug/$propertySlug/stays"
          />
          <OperationShortcut
            icon={BedDouble}
            title="Rooms"
            description="Manage room inventory and availability for your property."
            actionLabel="Manage rooms"
            to="/hotel/$organizationSlug/$propertySlug/rooms"
          />
          <OperationShortcut
            icon={Users}
            title="Guests"
            description="Find your hotel guests and review their stay information."
            actionLabel="View guests"
            to="/hotel/$organizationSlug/$propertySlug/guests"
          />
        </div>
      </Surface>
    </div>
  );
}

function OperationShortcut({
  icon: Icon,
  title,
  description,
  actionLabel,
  to,
}: {
  icon: typeof ClipboardCheck;
  title: string;
  description: string;
  actionLabel: string;
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
      <p className="mt-2 flex-1 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
      <Button
        className="mt-5"
        variant="ghost"
        render={<Link to={to} params={params} />}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
