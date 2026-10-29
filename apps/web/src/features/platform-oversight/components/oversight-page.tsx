import { AUDIT_ACTIONS, auditActionLabel, auditKindLabel, auditTarget, buildWeeklyCheckInsGrid, type WeeklyCheckInsGridProperty } from "@tattvix/api";
import type { PlatformOversightAuditEntry } from "@tattvix/contracts";
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

import { EmptyState, FilterBar, InitialsAvatar, ListRow, PageHeader, Panel, PanelHeader, PanelSection, ResponsiveTable, StatusPill } from "@/components/design-system";
import { Input } from "@tattvix/ui/components/input";
import { ApiError } from "@/lib/api";

import { platformOversightQueries } from "../queries";

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
        <ResponsiveTable
          label="Stays overview"
          rows={properties}
          getRowKey={(property) => property.propertyId}
          switchAt="3xl"
          columns={[
            { header: "Property", className: "font-medium", cell: (property) => property.propertyName },
            { header: "Organization", className: "text-muted-foreground", cell: (property) => property.organizationName },
            { header: "Pending check-in", width: "120px", align: "end", className: "tabular-nums", cell: (property) => property.statusCounts.pendingCheckIn },
            { header: "Checked in", width: "96px", align: "end", className: "tabular-nums", cell: (property) => property.statusCounts.checkedIn },
            { header: "Checked out", width: "96px", align: "end", className: "tabular-nums", cell: (property) => property.statusCounts.checkedOut },
            { header: "Total", width: "64px", align: "end", className: "font-medium tabular-nums", cell: (property) => property.totalStays },
          ]}
          mobileRow={(property) => (
            <ListRow
              title={property.propertyName}
              meta={
                <>
                  <span className="block">{property.organizationName}</span>
                  <span className="block">{property.statusCounts.pendingCheckIn} pending · {property.statusCounts.checkedIn} in house · {property.statusCounts.checkedOut} checked out</span>
                </>
              }
              trailing={<><span className="block font-medium">{property.totalStays}</span><span className="block text-xs text-subtle-foreground">stays</span></>}
            />
          )}
        />
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
        <ResponsiveTable
          label="Weekly check-ins"
          rows={grid.properties}
          getRowKey={(property) => `${property.organizationSlug}-${property.propertyId}`}
          switchAt="4xl"
          columns={[
            { header: "Property", width: "minmax(140px,1.5fr)", cell: (property) => <><p className="truncate font-medium">{property.propertyName}</p><p className="truncate text-xs text-muted-foreground">{property.organizationSlug}</p></> },
            ...grid.weeks.map((weekStart) => ({
              header: <span className="whitespace-nowrap">{formatWeekStart(weekStart)}</span>,
              cell: (property: WeeklyCheckInsGridProperty) => <WeeklyCheckInsBar checkIns={property.byWeek.get(weekStart) ?? 0} max={grid.maxCheckIns} />,
            })),
          ]}
          mobileRow={(property) => {
            const total = grid.weeks.reduce((sum, weekStart) => sum + (property.byWeek.get(weekStart) ?? 0), 0);
            return (
              <ListRow
                title={property.propertyName}
                meta={property.organizationSlug}
                trailing={<><span className="block font-medium">{total}</span><span className="block text-xs text-subtle-foreground">check-ins</span></>}
              >
                <WeeklyCheckInsSparkline weeks={grid.weeks} byWeek={property.byWeek} max={grid.maxCheckIns} />
              </ListRow>
            );
          }}
        />
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
      <div className="h-2 w-full min-w-10 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary"
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  );
}

/** Phone view of one property's weekly row: one column per week, oldest first. */
function WeeklyCheckInsSparkline({ weeks, byWeek, max }: { weeks: string[]; byWeek: Map<string, number>; max: number }) {
  return (
    <ol className="flex h-8 w-full items-end gap-1" aria-label="Check-ins per week, oldest first">
      {weeks.map((weekStart) => {
        const checkIns = byWeek.get(weekStart) ?? 0;
        const heightPercent = max > 0 ? Math.max((checkIns / max) * 100, checkIns > 0 ? 12 : 0) : 0;
        return (
          <li key={weekStart} className="flex h-full flex-1 items-end rounded-sm bg-muted" title={`${formatWeekStart(weekStart)}: ${checkIns}`}>
            <span className="sr-only">{formatWeekStart(weekStart)}: {checkIns}</span>
            <span aria-hidden className="w-full rounded-sm bg-primary" style={{ height: `${heightPercent}%` }} />
          </li>
        );
      })}
    </ol>
  );
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
    <Panel>
      <PanelHeader title="Audit trail" icon={ShieldAlert} />
      <PanelSection>
        <FilterBar>
          <Input
            className="sm:w-[220px]"
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
            <SelectTrigger className="w-full sm:w-[240px]" aria-label="Filter by action">
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
        </FilterBar>
      </PanelSection>

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
        <ResponsiveTable
          label="Audit trail"
          rows={entries}
          getRowKey={(entry) => entry.id}
          switchAt="4xl"
          columns={[
            { header: "Kind / Action", width: "minmax(0,1.2fr)", className: "flex flex-wrap items-center gap-2", cell: (entry) => <><KindBadge kind={entry.kind} /><span className="font-medium">{actionLabel(entry.action)}</span></> },
            { header: "Actor", width: "minmax(0,1.2fr)", className: "flex items-center gap-3", cell: (entry) => <><InitialsAvatar name={entry.actorEmail} /><span className="truncate text-muted-foreground">{entry.actorEmail}</span></> },
            { header: "Organization / Target", className: "text-xs text-muted-foreground wrap-anywhere", cell: (entry) => auditTarget(entry) },
            { header: "Recorded", width: "150px", align: "end", className: "text-xs whitespace-nowrap text-subtle-foreground tabular-nums", cell: (entry) => formatDateTime(entry.at) },
          ]}
          mobileRow={(entry) => (
            <ListRow
              title={actionLabel(entry.action)}
              badge={<KindBadge kind={entry.kind} />}
              meta={
                <>
                  <span className="block">{entry.actorEmail}</span>
                  <span className="block">{auditTarget(entry)}</span>
                  <span className="block">{formatDateTime(entry.at)}</span>
                </>
              }
            />
          )}
        />
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

function KindBadge({ kind }: { kind: PlatformOversightAuditEntry["kind"] }) {
  return <StatusPill tone="neutral">{auditKindLabel(kind)}</StatusPill>;
}

const actionLabel = auditActionLabel;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
