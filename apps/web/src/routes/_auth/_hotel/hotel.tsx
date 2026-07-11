import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_hotel/hotel")({
  component: HotelPortalPage,
});

function HotelPortalPage() {
  const memberships = Route.useRouteContext().auth.currentUser?.memberships ?? [];

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Hotel portal
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Your hotel access</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Owners, managers, and reception staff share this portal, while their effective
          permissions remain scoped to each organization and property.
        </p>
      </div>
      <div className="grid gap-4">
        {memberships.map((membership) => (
          <section key={membership.id} className="border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium">{membership.organization.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {membership.hasAllProperties
                    ? "All properties"
                    : `${membership.properties.length} assigned properties`}
                </p>
              </div>
              <span className="border bg-background px-2 py-1 text-xs font-medium">
                {formatRole(membership.role)}
              </span>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function formatRole(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
