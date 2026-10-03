import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { PageHeader, Panel, PanelHeader } from "@/components/design-system";
import { getInitials } from "@/lib/initials";

export const Route = createFileRoute("/_auth/_hotel/hotel/")({
  component: HotelPortalPage,
});

function HotelPortalPage() {
  const memberships =
    Route.useRouteContext().auth.currentUser?.memberships ?? [];

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6">
      <PageHeader title="My hotels" />

      <Panel>
        <PanelHeader title="Hotels" meta={memberships.length} />
        {memberships.map((membership) => (
          <Link key={membership.id} to="/hotel/$organizationSlug" params={{ organizationSlug: membership.organization.slug }} className="flex min-h-11 items-center gap-3 border-t border-border-soft px-5 py-2 hover:bg-muted/50">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
              {getInitials(membership.organization.name)}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">
                {membership.organization.name}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatRole(membership.role)} · {membership.properties.length}{" "}
                {membership.properties.length === 1 ? "property" : "properties"}
              </p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </Panel>
    </div>
  );
}

function formatRole(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
