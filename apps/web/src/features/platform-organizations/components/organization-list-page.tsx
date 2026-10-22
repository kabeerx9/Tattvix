import { Button } from "@tattvix/ui/components/button";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, ClipboardList, Plus, ShieldAlert, Users } from "lucide-react";

import { EmptyState, InitialsAvatar, Kpi, KpiStrip, ListRow, PageHeader, Panel, PanelHeader, ResponsiveTable, StatusPill } from "@/components/design-system";

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
        <Panel>
          <PanelHeader title="Organizations" meta={data.organizations.length} />
          <ResponsiveTable
            label="Organizations"
            rows={data.organizations}
            getRowKey={(organization) => organization.id}
            switchAt="2xl"
            rowLink={(organization, props) => <Link {...props} to="/admin/$organizationSlug" params={{ organizationSlug: organization.slug }} />}
            columns={[
              { header: "Organization", cell: (organization) => <><span className="font-medium">{organization.name}</span><span className="ml-2 text-xs text-subtle-foreground">{organization.slug}</span></> },
              { header: "Properties", width: "100px", align: "end", className: "text-xs text-subtle-foreground tabular-nums", cell: (organization) => propertyCountLabel(organization.propertyCount) },
              { header: "Members", width: "100px", align: "end", className: "text-xs text-subtle-foreground tabular-nums", cell: (organization) => `${organization.memberCount} members` },
              { header: "Status", width: "100px", cell: (organization) => <StatusBadge isActive={organization.isActive} /> },
              { header: "Open", width: "20px", hideHeader: true, cell: () => <ArrowRight className="size-4 text-muted-foreground" /> },
            ]}
            mobileRow={(organization) => (
              <ListRow
                leading={<InitialsAvatar name={organization.name} shape="square" />}
                title={organization.name}
                badge={<StatusBadge isActive={organization.isActive} />}
                meta={`${organization.slug} · ${propertyCountLabel(organization.propertyCount)} · ${organization.memberCount} members`}
                trailing={<ArrowRight className="size-4 text-muted-foreground" />}
              />
            )}
          />
        </Panel>
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

function propertyCountLabel(count: number) {
  return `${count} ${count === 1 ? "property" : "properties"}`;
}

function StatusBadge({ isActive }: { isActive: boolean }) { return <StatusPill tone={isActive ? "success" : "neutral"}>{isActive ? "Active" : "Inactive"}</StatusPill>; }
