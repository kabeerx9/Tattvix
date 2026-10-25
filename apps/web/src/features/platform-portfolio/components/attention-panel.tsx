// The admin's weekly to-do list, derived from the portfolio payload: organizations
// to chase for payment and hotels that have stopped checking guests in. Rows link
// to the organization page, where the trial can be extended. Aggregate data only.
import type { PlatformPortfolioProperty } from "@tattvix/contracts";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CircleAlert } from "lucide-react";

import { ListRow, Panel, PanelHeader, PanelSection, StatusPill } from "@/components/design-system";
import { formatShortDate } from "@/features/subscription/status";

import {
  BILLING_SOON_DAYS,
  STALE_AFTER_DAYS,
  formatLastActivity,
  type BillingAttention,
  type PortfolioAttention,
} from "../metrics";
import { SubscriptionPill } from "./portfolio-parts";

export function AttentionPanel({ attention }: { attention: PortfolioAttention }) {
  const count = attention.billing.length + attention.stale.length;
  return (
    <Panel>
      <PanelHeader title="Needs attention" icon={CircleAlert} meta={count || "All clear"} />
      <PanelSection>
        <AttentionGroup
          title="Billing"
          hint={`Trials ended, or ending within ${BILLING_SOON_DAYS} days.`}
          empty="No trials ending this week."
          items={attention.billing}
          getKey={(row) => row.organization.slug}
          render={(row) => <BillingRow row={row} />}
        />
      </PanelSection>
      <PanelSection>
        <AttentionGroup
          title={`No check-ins in ${STALE_AFTER_DAYS} days`}
          hint={`Live hotels, onboarded over ${STALE_AFTER_DAYS} days ago, with nobody checked in this week.`}
          empty="Every hotel checked someone in this week."
          items={attention.stale}
          getKey={(property) => property.id}
          render={(property) => <StaleRow property={property} />}
        />
      </PanelSection>
    </Panel>
  );
}

function AttentionGroup<T>({
  title,
  hint,
  empty,
  items,
  getKey,
  render,
}: {
  title: string;
  hint: string;
  empty: string;
  items: readonly T[];
  getKey: (item: T) => string | number;
  render: (item: T) => React.ReactNode;
}) {
  return (
    <div className="grid gap-3">
      <div>
        <h3 className="text-sm font-semibold">
          {title}
          {items.length ? <span className="ml-2 text-subtle-foreground tabular-nums">{items.length}</span> : null}
        </h3>
        <p className="text-xs text-subtle-foreground">{hint}</p>
      </div>
      {items.length ? (
        <ul className="grid divide-y divide-border-soft">
          {items.map((item) => (
            <li key={getKey(item)}>{render(item)}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function OrganizationLink({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <Link
      to="/admin/$organizationSlug"
      params={{ organizationSlug: slug }}
      className="-mx-2 block rounded-lg px-2 py-2.5 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
    >
      {children}
    </Link>
  );
}

function BillingRow({ row }: { row: BillingAttention }) {
  const { subscription } = row.organization;
  const properties = `${row.propertyCount} ${row.propertyCount === 1 ? "property" : "properties"}`;
  const when = subscription.entitledUntil ? formatShortDate(subscription.entitledUntil) : null;
  const meta =
    row.kind === "lapsed"
      ? when
        ? `${properties} · ended ${when} · check-ins paused`
        : `${properties} · never had a trial · check-ins paused`
      : `${properties} · ${subscription.status === "PAID" ? "paid until" : "trial ends"} ${when ?? "soon"}`;
  return (
    <OrganizationLink slug={row.organization.slug}>
      <ListRow
        title={row.organization.name}
        badge={<SubscriptionPill subscription={subscription} />}
        meta={meta}
        trailing={<ArrowRight className="size-4 text-muted-foreground" />}
      />
    </OrganizationLink>
  );
}

function StaleRow({ property }: { property: PlatformPortfolioProperty }) {
  return (
    <OrganizationLink slug={property.organization.slug}>
      <ListRow
        title={property.name}
        badge={<StatusPill tone="warning">{property.lastActivityAt ? "Gone quiet" : "Never used"}</StatusPill>}
        meta={`${property.organization.name} · ${property.rooms.total} rooms · ${formatLastActivity(property.lastActivityAt)}`}
        trailing={<ArrowRight className="size-4 text-muted-foreground" />}
      />
    </OrganizationLink>
  );
}
