import { Button } from "@tattvix/ui/components/button";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, ClipboardList, Plus, ShieldAlert, Users } from "lucide-react";

import { EmptyState, Kpi, KpiStrip, PageHeader, Panel, PanelHeader, StatusPill } from "@/components/design-system";

import { platformOrganizationQueries } from "../queries";

export function OrganizationListPage() {
  const { data } = useSuspenseQuery(platformOrganizationQueries.list());

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6">
      <PageHeader
        title="Organizations"
        actions={
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
              variant="outline"
              nativeButton={false}
              render={<Link to="/admin/requests" />}
            >
              <ClipboardList />
              Review requests
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

      <KpiStrip><Kpi icon={Building2} label="Organizations" value={data.organizations.length} /><Kpi icon={Building2} label="Active" value={data.organizations.filter((organization) => organization.isActive).length} /><Kpi icon={Users} label="Members" value={data.organizations.reduce((total, organization) => total + organization.memberCount, 0)} /></KpiStrip>
      {data.organizations.length ? (
        <Panel><PanelHeader title="Organizations" meta={data.organizations.length} /><div className="overflow-x-auto"><div role="table" className="min-w-[720px]"><div role="row" className="grid h-11 grid-cols-[minmax(0,1fr)_100px_100px_100px_20px] items-center gap-4 bg-muted px-5 text-xs text-subtle-foreground"><span role="columnheader">Organization</span><span role="columnheader" className="text-right">Properties</span><span role="columnheader" className="text-right">Members</span><span role="columnheader">Status</span><span /></div>
          {data.organizations.map((organization) => (
            <Link key={organization.id} role="row" to="/admin/$organizationSlug" params={{ organizationSlug: organization.slug }} className="grid min-h-11 grid-cols-[minmax(0,1fr)_100px_100px_100px_20px] items-center gap-4 border-t border-border-soft px-5 py-2 text-sm hover:bg-muted/50"><span role="cell" className="min-w-0"><span className="font-medium">{organization.name}</span><span className="ml-2 text-xs text-subtle-foreground">{organization.slug}</span></span><span role="cell" className="text-right text-xs text-subtle-foreground tabular-nums">{organization.propertyCount} propert
                {organization.propertyCount === 1 ? "y" : "ies"}
                </span><span role="cell" className="text-right text-xs text-subtle-foreground tabular-nums">{organization.memberCount} members</span><span role="cell"><StatusBadge isActive={organization.isActive} /></span><ArrowRight className="size-4 text-muted-foreground" /></Link>
          ))}
        </div></div></Panel>
      ) : (
        <Panel>
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
        </Panel>
      )}
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) { return <StatusPill tone={isActive ? "success" : "neutral"}>{isActive ? "Active" : "Inactive"}</StatusPill>; }
