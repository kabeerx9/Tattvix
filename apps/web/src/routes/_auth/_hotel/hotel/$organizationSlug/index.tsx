import { Button } from "@tattvix/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Building2, Users } from "lucide-react";

import { PageHeader, Surface } from "@/components/design-system";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/",
)({
  component: OrganizationWorkspacePage,
});

function OrganizationWorkspacePage() {
  const { activeMembership } = Route.useRouteContext();
  const { organization, properties, role } = activeMembership;
  const canViewMembers = activeMembership.permissions.includes("members:view");

  return (
    <div className="mx-auto grid max-w-[1360px] gap-8">
      <PageHeader
        eyebrow={`${formatRole(role)} workspace`}
        title={organization.name}
        description="Choose a property for daily operations or manage organization-wide access."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {properties.map((property) => (
          <Surface key={property.id} className="flex items-center gap-4 p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Building2 className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">{property.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Property workspace</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Open ${property.name}`}
              render={
                <Link
                  to="/hotel/$organizationSlug/$propertySlug/dashboard"
                  params={{
                    organizationSlug: organization.slug,
                    propertySlug: property.slug,
                  }}
                />
              }
            >
              <ArrowRight />
            </Button>
          </Surface>
        ))}
      </div>

      {canViewMembers ? (
        <Surface className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted">
            <Users className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Organization members</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Invitations and property access will be managed at this level.
            </p>
          </div>
        </div>
        <Button variant="outline" disabled>
          Member management coming next
        </Button>
        </Surface>
      ) : null}
    </div>
  );
}

function formatRole(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
