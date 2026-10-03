import { useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type {
  HotelReportInHouseEntry,
  HotelReportRegisterEntry,
} from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import {
  BedDouble,
  ClipboardList,
  Download,
  Gauge,
  UserRound,
} from "lucide-react";

import { EmptyState, Kpi, KpiStrip, PageHeader, Panel, PanelHeader, PanelSection, StatusPill } from "@/components/design-system";
import { ApiError } from "@/lib/api";
import { getInitials } from "@/lib/initials";

import { hotelReportsApi } from "../api";
import { hotelReportsQueries } from "../queries";

function todayIsoDate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function HotelReportsPage({
  organizationSlug,
  propertySlug,
}: {
  organizationSlug: string;
  propertySlug: string;
  propertyName: string;
}) {
  const today = todayIsoDate();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const range = { dateFrom, dateTo };

  const registerQuery = useQuery(
    hotelReportsQueries.register(organizationSlug, propertySlug, range),
  );
  const statusCountsQuery = useQuery(
    hotelReportsQueries.statusCounts(organizationSlug, propertySlug, range),
  );
  const { data: inHouse } = useSuspenseQuery(
    hotelReportsQueries.inHouse(organizationSlug, propertySlug),
  );
  const { data: occupancy } = useSuspenseQuery(
    hotelReportsQueries.occupancy(organizationSlug, propertySlug),
  );

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function downloadCsv() {
    setDownloadError(null);
    setIsDownloading(true);
    try {
      const { blob, filename } = await hotelReportsApi.downloadRegisterCsv(
        organizationSlug,
        propertySlug,
        range,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename ?? `register-${dateFrom}_${dateTo}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(
        error instanceof ApiError
          ? error.message
          : "The register export could not be downloaded.",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6">
      <PageHeader title="Reports" />

      <Panel>
      <PanelSection className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-4">
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">
              From
            </span>
            <Input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-44"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">
              To
            </span>
            <Input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-44"
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Applies to the register and status counts below.
          </p>
        </div>
      </PanelSection>
      </Panel>

      <OccupancySection occupancy={occupancy} />

      <StatusCountsSection
        counts={statusCountsQuery.data?.counts}
        isLoading={statusCountsQuery.isLoading}
      />

      <InHouseSection entries={inHouse.entries} />

      <RegisterSection
        entries={registerQuery.data?.entries ?? []}
        isLoading={registerQuery.isLoading}
        onDownload={downloadCsv}
        isDownloading={isDownloading}
        downloadError={downloadError}
      />
    </div>
  );
}

function SectionHeader({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description: string;
  icon: typeof Gauge;
  action?: React.ReactNode;
}) {
  return <PanelHeader title={title} icon={Icon} actions={action} />;
}

function OccupancySection({
  occupancy,
}: {
  occupancy: {
    occupiedRooms: number;
    activeRooms: number;
    statusCounts: Record<"VACANT" | "OCCUPIED" | "CLEANING" | "MAINTENANCE", number>;
  };
}) {
  return (
    <KpiStrip>
        <Kpi
          icon={BedDouble}
          label="Occupied / active rooms"
          value={`${occupancy.occupiedRooms} / ${occupancy.activeRooms}`}
          detail="Rooms currently occupied out of active inventory"
        />
        <Kpi
          icon={BedDouble}
          label="Vacant"
          value={String(occupancy.statusCounts.VACANT)}
          detail="Ready to assign"
        />
        <Kpi
          icon={BedDouble}
          label="Cleaning"
          value={String(occupancy.statusCounts.CLEANING)}
          detail="Turned over, not yet vacant"
        />
        <Kpi
          icon={BedDouble}
          label="Maintenance"
          value={String(occupancy.statusCounts.MAINTENANCE)}
          detail="Out of service"
        />
    </KpiStrip>
  );
}

function StatusCountsSection({
  counts,
  isLoading,
}: {
  counts?: { pendingCheckIn: number; checkedIn: number; checkedOut: number };
  isLoading: boolean;
}) {
  return (
    <Panel>
      <SectionHeader
        title="Status counts"
        description="Stays by operational status over the selected date range."
        icon={ClipboardList}
      />
      {isLoading || !counts ? (
        <div className="p-5 text-sm text-muted-foreground sm:p-6">
          Loading…
        </div>
      ) : (
        <div className="grid grid-cols-3 divide-x">
          <StatusCountTile label="Pending check-in" value={counts.pendingCheckIn} />
          <StatusCountTile label="Checked in" value={counts.checkedIn} />
          <StatusCountTile label="Checked out" value={counts.checkedOut} />
        </div>
      )}
    </Panel>
  );
}

function StatusCountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-1 p-5 text-center sm:p-6">
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function InHouseSection({ entries }: { entries: HotelReportInHouseEntry[] }) {
  return (
    <Panel>
      <SectionHeader
        title="Current in-house"
        description="Guests who are checked in and currently occupy a room."
        icon={UserRound}
      />
      {entries.length ? (
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="bg-muted text-xs text-subtle-foreground"><th className="p-4 font-medium sm:px-5">Guest</th><th className="p-4 font-medium sm:px-5">Room</th><th className="p-4 font-medium sm:px-5">Checked in</th></tr></thead><tbody className="divide-y">{entries.map((entry) => <tr key={entry.stayId}><td className="p-4 sm:px-5"><span className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold">{getInitials(entry.guestName)}</span><span className="font-medium">{entry.guestName}</span></span></td><td className="p-4 tabular-nums text-muted-foreground sm:px-5">{entry.roomNumber ?? "—"}</td><td className="p-4 tabular-nums text-muted-foreground sm:px-5">{entry.checkedInAt ? formatDateTime(entry.checkedInAt) : "—"}</td></tr>)}</tbody></table></div>
      ) : (
        <EmptyState
          icon={UserRound}
          title="No one is checked in"
          description="Guests appear here once reception assigns a room and confirms check-in."
        />
      )}
    </Panel>
  );
}

function RegisterSection({
  entries,
  isLoading,
  onDownload,
  isDownloading,
  downloadError,
}: {
  entries: HotelReportRegisterEntry[];
  isLoading: boolean;
  onDownload: () => void;
  isDownloading: boolean;
  downloadError: string | null;
}) {
  return (
    <Panel>
      <SectionHeader
        title="Register"
        description="Check-ins and check-outs over the selected date range."
        icon={ClipboardList}
        action={
          <div className="grid justify-items-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              disabled={isDownloading}
            >
              <Download className="size-4" />
              {isDownloading ? "Preparing…" : "Download CSV"}
            </Button>
            {downloadError ? (
              <p className="text-xs text-destructive">{downloadError}</p>
            ) : null}
          </div>
        }
      />
      {isLoading ? (
        <div className="p-5 text-sm text-muted-foreground sm:p-6">
          Loading…
        </div>
      ) : entries.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-muted text-xs text-subtle-foreground">
                <th className="p-4 font-medium sm:p-5">Guest</th>
                <th className="p-4 text-right font-medium sm:p-5">Companions</th>
                <th className="p-4 font-medium sm:p-5">Room</th>
                <th className="p-4 font-medium sm:p-5">Checked in</th>
                <th className="p-4 font-medium sm:p-5">Checked out</th>
                <th className="p-4 font-medium sm:p-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((entry) => (
                <tr key={entry.stayId}>
                  <td className="p-4 font-medium sm:p-5"><span className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold">{getInitials(entry.guestName)}</span>{entry.guestName}</span></td>
                  <td className="p-4 text-right text-muted-foreground tabular-nums sm:p-5">
                    {entry.companionCount}
                  </td>
                  <td className="p-4 text-muted-foreground tabular-nums sm:p-5">
                    {entry.roomNumber ?? "—"}
                  </td>
                  <td className="p-4 text-muted-foreground tabular-nums sm:p-5">
                    {entry.checkedInAt ? formatDateTime(entry.checkedInAt) : "—"}
                  </td>
                  <td className="p-4 text-muted-foreground sm:p-5">
                    {entry.checkedOutAt ? formatDateTime(entry.checkedOutAt) : "—"}
                  </td>
                  <td className="p-4 text-muted-foreground sm:p-5">
                    <ReportStatusPill status={entry.operationalStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No activity in this range"
          description="No check-ins or check-outs were recorded for the selected dates."
        />
      )}
    </Panel>
  );
}

function formatStatus(status: string) {
  switch (status) {
    case "CHECKED_IN":
      return "Checked in";
    case "CHECKED_OUT":
      return "Checked out";
    default:
      return "Pending check-in";
  }
}

function ReportStatusPill({ status }: { status: string }) {
  return <StatusPill tone={status === "CHECKED_IN" ? "success" : status === "CHECKED_OUT" ? "neutral" : "warning"}>{formatStatus(status)}</StatusPill>;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
