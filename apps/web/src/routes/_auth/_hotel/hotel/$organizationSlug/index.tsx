import { Button } from "@tattvix/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Users } from "lucide-react";

import { PageHeader, Panel, PanelHeader, PanelSection } from "@/components/design-system";
import { getInitials } from "@/lib/initials";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/",
)({
  component: OrganizationWorkspacePage,
});

function OrganizationWorkspacePage() {
  const { activeMembership } = Route.useRouteContext();
  const { organization, properties } = activeMembership;
  const canViewMembers = activeMembership.permissions.includes("members:view");

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6">
      <PageHeader title={organization.name} />

      <Panel>
        <PanelHeader title="Properties" meta={properties.length} />
        {properties.map((property) => (
          <Link key={property.id} to="/hotel/$organizationSlug/$propertySlug/dashboard" params={{ organizationSlug: organization.slug, propertySlug: property.slug }} className="flex min-h-11 items-center gap-3 border-t border-border-soft px-5 py-2 hover:bg-muted/50">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
              {getInitials(property.name)}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">{property.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Property workspace</p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </Panel>

      {canViewMembers ? (
        <Panel>
        <PanelSection className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <Users className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Organization members</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Invitations and property access will be managed at this level.
            </p>
          </div>
        </div>
        </PanelSection>
        </Panel>
      ) : null}
    </div>
  );
}
