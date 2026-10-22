import type { PlatformOrganizationSummary } from "@tattvix/contracts";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2 } from "lucide-react";

import { InitialsAvatar, ListRow, Panel, PanelHeader, ResponsiveTable, StatusPill } from "@/components/design-system";

/** Organizations, including ones with no properties yet, under the portfolio. */
export function OrganizationsPanel({ organizations }: { organizations: readonly PlatformOrganizationSummary[] }) {
  if (!organizations.length) return null;
  return (
    <Panel>
      <PanelHeader title="Organizations" icon={Building2} meta={organizations.length} />
      <ResponsiveTable
        label="Organizations"
        rows={organizations}
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
  );
}

function propertyCountLabel(count: number) {
  return `${count} ${count === 1 ? "property" : "properties"}`;
}

function StatusBadge({ isActive }: { isActive: boolean }) { return <StatusPill tone={isActive ? "success" : "neutral"}>{isActive ? "Active" : "Inactive"}</StatusPill>; }
