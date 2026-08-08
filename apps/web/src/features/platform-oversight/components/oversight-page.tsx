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

import { EmptyState, PageHeader, Surface } from "@/components/design-system";
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
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <PageHeader
        eyebrow="Platform administration"
        title="Oversight"
        description="Stay activity and the identity-access audit trail across every hotel, without ever surfacing identity documents."
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
    <Surface>
      <div className="flex items-start gap-3 border-b p-5 sm:p-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
          <Hotel className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Stays overview</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Stay counts by status for every active property. Guest identity
            is never shown here.
          </p>
        </div>
      </div>

      {properties.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/60 text-left text-xs text-muted-foreground">
                <th className="p-4 font-medium">Property</th>
                <th className="p-4 font-medium">Organization</th>
                <th className="p-4 font-medium">Pending check-in</th>
                <th className="p-4 font-medium">Checked in</th>
                <th className="p-4 font-medium">Checked out</th>
                <th className="p-4 font-medium">Total</th>
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
    </Surface>
  );
}

function PropertyRow({
  property,
}: {
  property: PlatformOversightPropertyStays;
}) {
  return (
    <tr>
      <td className="p-4">
        <p className="font-medium">{property.propertyName}</p>
      </td>
      <td className="p-4 text-muted-foreground">
        {property.organizationName}
      </td>
      <td className="p-4">{property.statusCounts.pendingCheckIn}</td>
      <td className="p-4">{property.statusCounts.checkedIn}</td>
      <td className="p-4">{property.statusCounts.checkedOut}</td>
      <td className="p-4 font-medium">{property.totalStays}</td>
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
    <Surface>
      <div className="flex items-start gap-3 border-b p-5 sm:p-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
          <LineChart className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Weekly check-ins</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Check-ins per property over the last {WEEKLY_CHECK_INS_WEEKS} weeks —
            the pilot-adoption trend. Weeks a property had zero check-ins are
            filled in as 0 rather than omitted.
          </p>
        </div>
      </div>

      {grid.properties.length && grid.weeks.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/60 text-left text-xs text-muted-foreground">
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
                  <td className="p-4">
                    <p className="font-medium">{property.propertyName}</p>
                    <p className="text-xs text-muted-foreground">
                      {property.organizationSlug}
                    </p>
                  </td>
                  {grid.weeks.map((weekStart) => {
                    const checkIns = property.byWeek.get(weekStart) ?? 0;
                    return (
                      <td key={weekStart} className="p-4">
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
    </Surface>
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
    <Surface>
      <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
            <ShieldAlert className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Audit trail</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Who viewed identity details, and every platform-admin action.
              Document images are never included.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="h-9 w-[200px] rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder="Filter by organization slug"
            aria-label="Filter by organization slug"
            value={organizationSlug}
            onChange={(event) => setOrganizationSlug(event.target.value)}
          />
          <Select
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
      </div>

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
        <div className="divide-y">
          {entries.map((entry) => (
            <AuditRow key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No audit events match these filters"
          description="Clear the filters, or check back after the next platform action."
        />
      )}
    </Surface>
  );
}

function AuditRow({ entry }: { entry: PlatformOversightAuditEntry }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind={entry.kind} />
          <p className="text-sm font-medium">{actionLabel(entry.action)}</p>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {entry.actorEmail} · {entry.organizationSlug}
          {entry.kind === "IDENTITY_ACCESS"
            ? ` · ${entry.propertyName}`
            : ` · ${entry.target}`}
        </p>
      </div>
      <p className="shrink-0 text-xs text-muted-foreground">
        <ClipboardList className="mr-1 inline size-3.5 align-[-2px]" />
        {formatDateTime(entry.at)}
      </p>
    </div>
  );
}

function KindBadge({ kind }: { kind: PlatformOversightAuditEntry["kind"] }) {
  const isIdentity = kind === "IDENTITY_ACCESS";
  return (
    <span
      className={
        isIdentity
          ? "rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-700 dark:text-sky-300"
          : "rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
      }
    >
      {isIdentity ? "Identity access" : "Platform admin"}
    </span>
  );
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
