import type {
  PlatformOversightAuditEntry,
  PlatformOversightPropertyStays,
  PlatformOversightWeeklyCheckInsRow,
} from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tattvix/ui/components/select";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ClipboardList, Hotel, LineChart, RefreshCw, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { EmptyState, PageHeader, Panel, PanelHeader, PanelSection, StatusPill } from "@/components/design-system";
import { Input } from "@tattvix/ui/components/input";
import { getInitials } from "@/lib/initials";
import { ApiError } from "@/lib/api";

import { platformOversightQueries } from "../queries";

const AUDIT_ACTIONS = [
  { value: "", label: "All actions" },
  { value: "DETAILS_VIEWED", label: "Identity details viewed" },
  { value: "DOCUMENT_VIEWED", label: "Document image viewed" },
  { value: "STAY_CLOSED", label: "Stay closed" },
  { value: "CONSENT_REVOKED", label: "Consent revoked" },
  { value: "PROPERTY_CREATED", label: "Property created" },
  { value: "MEMBER_ADDED", label: "Member added" },
  { value: "MEMBER_ROLE_CHANGED", label: "Member role changed" },
  { value: "MEMBER_DEACTIVATED", label: "Member deactivated" },
  { value: "MEMBER_REACTIVATED", label: "Member reactivated" },
] as const;

export function OversightPage() {
  return (
    <div className="mx-auto grid max-w-[1400px] gap-6">
      <PageHeader
        title="Oversight"
      />

      <StaysOverviewSection />
      <WeeklyCheckInsSection />
      <AuditFeedSection />
    </div>
  );
}

function StaysOverviewSection() {
  const { data } = useSuspenseQuery(platformOversightQueries.stays());
  const properties = data.properties;

  return (
    <Panel>
      <PanelHeader title="Stays overview" icon={Hotel} meta={properties.length} />
      <PanelSection className="text-xs text-subtle-foreground">Stay counts across active properties.</PanelSection>

      {properties.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted text-left text-xs text-subtle-foreground">
                <th className="p-4 font-medium">Property</th>
                <th className="p-4 font-medium">Organization</th>
                <th className="px-5 py-3 text-right font-medium">Pending check-in</th>
                <th className="px-5 py-3 text-right font-medium">Checked in</th>
                <th className="px-5 py-3 text-right font-medium">Checked out</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {properties.map((property) => (
                <PropertyRow key={property.propertyId} property={property} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={Hotel}
          title="No active properties yet"
          description="Onboard a hotel to see stay activity here."
        />
      )}
    </Panel>
  );
}

function PropertyRow({
  property,
}: {
  property: PlatformOversightPropertyStays;
}) {
  return (
    <tr className="h-11 border-t border-border-soft">
      <td className="px-5 py-2">
        <p className="font-medium">{property.propertyName}</p>
      </td>
      <td className="px-5 py-2 text-muted-foreground">
        {property.organizationName}
      </td>
      <td className="px-5 py-2 text-right tabular-nums">{property.statusCounts.pendingCheckIn}</td>
      <td className="px-5 py-2 text-right tabular-nums">{property.statusCounts.checkedIn}</td>
      <td className="px-5 py-2 text-right tabular-nums">{property.statusCounts.checkedOut}</td>
      <td className="px-5 py-2 text-right font-medium tabular-nums">{property.totalStays}</td>
    </tr>
  );
}

const WEEKLY_CHECK_INS_WEEKS = 8;

function WeeklyCheckInsSection() {
  const { data } = useSuspenseQuery(
    platformOversightQueries.weeklyCheckIns({ weeks: WEEKLY_CHECK_INS_WEEKS }),
  );
  const grid = buildWeeklyCheckInsGrid(data.rows);

  return (
    <Panel>
      <PanelHeader title="Weekly check-ins" icon={LineChart} meta={`${WEEKLY_CHECK_INS_WEEKS} weeks`} />

      {grid.properties.length && grid.weeks.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted text-left text-xs text-subtle-foreground">
                <th className="p-4 font-medium">Property</th>
                {grid.weeks.map((weekStart) => (
                  <th key={weekStart} className="p-4 font-medium whitespace-nowrap">
                    {formatWeekStart(weekStart)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {grid.properties.map((property) => (
                <tr key={`${property.organizationSlug}-${property.propertyId}`}>
                  <td className="px-5 py-2">
                    <p className="font-medium">{property.propertyName}</p>
                    <p className="text-xs text-muted-foreground">
                      {property.organizationSlug}
                    </p>
                  </td>
                  {grid.weeks.map((weekStart) => {
                    const checkIns = property.byWeek.get(weekStart) ?? 0;
                    return (
                      <td key={weekStart} className="px-5 py-2">
                        <WeeklyCheckInsBar
                          checkIns={checkIns}
                          max={grid.maxCheckIns}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={LineChart}
          title="No check-ins recorded yet"
          description="Check-in a guest at any property to see the weekly trend here."
        />
      )}
    </Panel>
  );
}

function WeeklyCheckInsBar({ checkIns, max }: { checkIns: number; max: number }) {
  const widthPercent = max > 0 ? Math.max((checkIns / max) * 100, checkIns > 0 ? 8 : 0) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 shrink-0 text-right tabular-nums">{checkIns}</span>
      <div className="h-2 w-full min-w-[64px] rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary"
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  );
}

type WeeklyCheckInsGridProperty = {
  propertyId: number;
  propertyName: string;
  organizationSlug: string;
  byWeek: Map<string, number>;
};

function buildWeeklyCheckInsGrid(rows: PlatformOversightWeeklyCheckInsRow[]): {
  weeks: string[];
  properties: WeeklyCheckInsGridProperty[];
  maxCheckIns: number;
} {
  const weeks = Array.from(new Set(rows.map((row) => row.weekStart))).sort();
  const propertiesByKey = new Map<string, WeeklyCheckInsGridProperty>();
  let maxCheckIns = 0;

  for (const row of rows) {
    const key = `${row.organizationSlug}-${row.propertyId}`;
    let property = propertiesByKey.get(key);
    if (!property) {
      property = {
        propertyId: row.propertyId,
        propertyName: row.propertyName,
        organizationSlug: row.organizationSlug,
        byWeek: new Map(),
      };
      propertiesByKey.set(key, property);
    }
    property.byWeek.set(row.weekStart, row.checkIns);
    maxCheckIns = Math.max(maxCheckIns, row.checkIns);
  }

  const properties = Array.from(propertiesByKey.values()).sort((a, b) =>
    a.propertyName.localeCompare(b.propertyName),
  );

  return { weeks, properties, maxCheckIns };
}

function formatWeekStart(weekStart: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${weekStart}T00:00:00Z`));
}

function AuditFeedSection() {
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [action, setAction] = useState("");
  const { data, isPending, isError, error, refetch, isFetching } = useQuery(
    platformOversightQueries.audit({
      organizationSlug: organizationSlug || undefined,
      action: action || undefined,
      limit: 50,
    }),
  );
  const entries = data?.entries ?? [];
  const errorMessage =
    error instanceof ApiError ? error.message : "The audit trail could not be loaded.";

  return (
    <Panel className="[&>header]:flex-wrap">
      <PanelHeader title="Audit trail" icon={ShieldAlert} actions={
        <div className="flex flex-wrap gap-2">
          <Input
            className="w-[200px]"
            placeholder="Filter by organization slug"
            aria-label="Filter by organization slug"
            value={organizationSlug}
            onChange={(event) => setOrganizationSlug(event.target.value)}
          />
          <Select
            items={AUDIT_ACTIONS.map((option) => ({ value: option.value || "__all__", label: option.label }))}
            value={action || "__all__"}
            onValueChange={(value) =>
              setAction(value === "__all__" || !value ? "" : value)
            }
          >
            <SelectTrigger className="w-[220px]" aria-label="Filter by action">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIT_ACTIONS.map((option) => (
                <SelectItem
                  key={option.value || "__all__"}
                  value={option.value || "__all__"}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      } />

      {isPending ? (
        <p className="p-6 text-sm text-muted-foreground">
          Loading audit events...
        </p>
      ) : isError ? (
        <EmptyState
          icon={ShieldAlert}
          title="The audit trail could not be loaded"
          description={errorMessage}
          action={
            <Button variant="outline" disabled={isFetching} onClick={() => refetch()}>
              <RefreshCw />
              {isFetching ? "Retrying..." : "Retry"}
            </Button>
          }
        />
      ) : entries.length ? (
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-muted text-left text-xs text-subtle-foreground"><tr><th className="px-5 py-3 font-medium">Kind / Action</th><th className="px-5 py-3 font-medium">Actor</th><th className="px-5 py-3 font-medium">Organization / Target</th><th className="px-5 py-3 text-right font-medium">Recorded</th></tr></thead><tbody>{entries.map((entry) => <AuditRow key={entry.id} entry={entry} />)}</tbody></table></div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No audit events match these filters"
          description="Clear the filters, or check back after the next platform action."
        />
      )}
    </Panel>
  );
}

function AuditRow({ entry }: { entry: PlatformOversightAuditEntry }) {
  return <tr className="h-11 border-t border-border-soft"><td className="px-5 py-2"><div className="flex flex-wrap items-center gap-2"><KindBadge kind={entry.kind} /><span className="font-medium">{actionLabel(entry.action)}</span></div></td><td className="px-5 py-2"><div className="flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{getInitials(entry.actorEmail)}</span><span className="text-muted-foreground">{entry.actorEmail}</span></div></td><td className="px-5 py-2 text-xs text-muted-foreground">{entry.organizationSlug} · {entry.kind === "IDENTITY_ACCESS" ? entry.propertyName : entry.target}</td><td className="px-5 py-2 text-right text-xs whitespace-nowrap text-subtle-foreground tabular-nums">{formatDateTime(entry.at)}</td></tr>;
}

function KindBadge({ kind }: { kind: PlatformOversightAuditEntry["kind"] }) {
  return <StatusPill tone="neutral">{kind === "IDENTITY_ACCESS" ? "Identity access" : "Platform admin"}</StatusPill>;
}

function actionLabel(action: string) {
  const match = AUDIT_ACTIONS.find((option) => option.value === action);
  return match ? match.label : action;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
