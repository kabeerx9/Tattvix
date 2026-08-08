import { Button } from "@tattvix/ui/components/button";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Plus, ShieldAlert } from "lucide-react";

import { EmptyState, PageHeader, Surface } from "@/components/design-system";

import { platformOrganizationQueries } from "../queries";

export function OrganizationListPage() {
  const { data } = useSuspenseQuery(platformOrganizationQueries.list());

  return (
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <PageHeader
        eyebrow="Platform administration"
        title="Organizations"
        description="Every hotel business onboarded to Tattvix, with its properties and members."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/admin/oversight" />}
            >
              <ShieldAlert />
              Oversight
            </Button>
            <Button
              nativeButton={false}
              render={<Link to="/admin/onboard" />}
            >
              <Plus />
              Onboard a hotel
            </Button>
          </div>
        }
      />

      {data.organizations.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.organizations.map((organization) => (
            <Surface key={organization.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted">
                  <Building2 className="size-5" />
                </span>
                <StatusBadge isActive={organization.isActive} />
              </div>
              <h2 className="mt-5 text-xl font-semibold">
                {organization.name}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {organization.slug}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                {organization.propertyCount} propert
                {organization.propertyCount === 1 ? "y" : "ies"}
                {" · "}
                {organization.memberCount} member
                {organization.memberCount === 1 ? "" : "s"}
              </p>
              <Button
                className="mt-5 w-full"
                variant="outline"
                nativeButton={false}
                render={
                  <Link
                    to="/admin/$organizationSlug"
                    params={{ organizationSlug: organization.slug }}
                  />
                }
              >
                Manage
                <ArrowRight />
              </Button>
            </Surface>
          ))}
        </div>
      ) : (
        <Surface>
          <EmptyState
            icon={Building2}
            title="No hotels onboarded yet"
            description="Onboard the first organization, property, and owner to get started."
            action={
              <Button nativeButton={false} render={<Link to="/admin/onboard" />}>
                <Plus />
                Onboard a hotel
              </Button>
            }
          />
        </Surface>
      )}
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={
        isActive
          ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
          : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
      }
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}
