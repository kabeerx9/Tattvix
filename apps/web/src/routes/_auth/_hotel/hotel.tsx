import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Building2 } from "lucide-react";
import { Button } from "@tattvix/ui/components/button";
import { PageHeader, Surface } from "@/components/design-system";

export const Route = createFileRoute("/_auth/_hotel/hotel")({
  component: HotelPortalPage,
});

function HotelPortalPage() {
  const memberships = Route.useRouteContext().auth.currentUser?.memberships ?? [];

  return (
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <PageHeader eyebrow="Property access" title="Choose your workspace" description="Your available hotels and permissions are managed securely for each organization." />
      <div className="grid gap-4 lg:grid-cols-2">
        {memberships.map((membership) => (
          <Surface key={membership.id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-xl bg-accent text-primary"><Building2 className="size-5" /></span><div>
                <h2 className="text-base font-semibold">{membership.organization.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {membership.hasAllProperties
                    ? "All properties"
                    : `${membership.properties.length} assigned properties`}
                </p>
              </div></div><Button variant="ghost" className="rounded-xl">{formatRole(membership.role)} <ArrowRight className="size-4" /></Button>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}

function formatRole(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
