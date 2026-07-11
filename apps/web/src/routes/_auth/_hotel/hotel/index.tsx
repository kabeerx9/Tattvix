import { Button } from "@tattvix/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Building2 } from "lucide-react";

import { PageHeader, Surface } from "@/components/design-system";

export const Route = createFileRoute("/_auth/_hotel/hotel/")({
  component: HotelPortalPage,
});

function HotelPortalPage() {
  const memberships = Route.useRouteContext().auth.currentUser?.memberships ?? [];

  return (
    <div className="mx-auto grid max-w-[1360px] gap-8">
      <PageHeader
        eyebrow="Hotel access"
        title="Choose your organization"
        description="Open an organization to manage its properties, members, and daily operations."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {memberships.map((membership) => (
          <Surface key={membership.id} className="flex items-center gap-4 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Building2 className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold">
                {membership.organization.name}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatRole(membership.role)} · {membership.properties.length}{" "}
                {membership.properties.length === 1 ? "property" : "properties"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Open ${membership.organization.name}`}
              render={
                <Link
                  to="/hotel/$organizationSlug"
                  params={{ organizationSlug: membership.organization.slug }}
                />
              }
            >
              <ArrowRight />
            </Button>
          </Surface>
        ))}
      </div>
    </div>
  );
}

function formatRole(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
