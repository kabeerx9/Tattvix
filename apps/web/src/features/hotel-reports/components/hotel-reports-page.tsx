import { useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type {
  HotelReportInHouseEntry,
  HotelReportRegisterEntry,
} from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { ClipboardList, Download, Gauge, UserRound } from "lucide-react";

import { EmptyState, FilterBar, InitialsAvatar, Kpi, KpiStrip, ListRow, PageHeader, Panel, PanelHeader, PanelSection, ResponsiveTable, StatusPill } from "@/components/design-system";
import { ApiError } from "@/lib/api";

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
      <PanelSection>
        <FilterBar className="grid-cols-2 gap-4">
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">From</span>
            <Input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(event) => setDateFrom(event.target.value)}
              className="sm:w-44"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">To</span>
            <Input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(event) => setDateTo(event.target.value)}
              className="sm:w-44"
            />
          </label>
          <p className="col-span-2 text-xs text-muted-foreground sm:pb-2">
            Applies to the register and status counts below.
          </p>
        </FilterBar>
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
          label="Occupied / active rooms"
          value={`${occupancy.occupiedRooms} / ${occupancy.activeRooms}`}
          detail="Rooms currently occupied out of active inventory"
        />
        <Kpi
          label="Vacant"
          value={String(occupancy.statusCounts.VACANT)}
          detail="Ready to assign"
        />
        <Kpi
          label="Cleaning"
          value={String(occupancy.statusCounts.CLEANING)}
          detail="Turned over, not yet vacant"
        />
        <Kpi
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
    <div className="grid content-start gap-1 p-3 text-center sm:p-6">
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
        <ResponsiveTable
          label="Current in-house"
          rows={entries}
          getRowKey={(entry) => entry.stayId}
          switchAt="lg"
          columns={[
            { header: "Guest", width: "minmax(0,2fr)", className: "flex items-center gap-3 font-medium", cell: (entry) => <><InitialsAvatar name={entry.guestName} /><span className="truncate">{entry.guestName}</span></> },
            { header: "Room", width: "80px", className: "tabular-nums text-muted-foreground", cell: (entry) => entry.roomNumber ?? "—" },
            { header: "Checked in", className: "tabular-nums text-muted-foreground", cell: (entry) => entry.checkedInAt ? formatDateTime(entry.checkedInAt) : "—" },
          ]}
          mobileRow={(entry) => <ListRow leading={<InitialsAvatar name={entry.guestName} />} title={entry.guestName} meta={`Room ${entry.roomNumber ?? "—"} · Checked in ${entry.checkedInAt ? formatDateTime(entry.checkedInAt) : "—"}`} />}
        />
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
        <ResponsiveTable
          label="Register"
          rows={entries}
          getRowKey={(entry) => entry.stayId}
          switchAt="4xl"
          columns={[
            { header: "Guest", width: "minmax(0,1.5fr)", className: "flex items-center gap-3 font-medium", cell: (entry) => <><InitialsAvatar name={entry.guestName} /><span className="truncate">{entry.guestName}</span></> },
            { header: "Companions", width: "96px", align: "end", className: "tabular-nums text-muted-foreground", cell: (entry) => entry.companionCount },
            { header: "Room", width: "64px", className: "tabular-nums text-muted-foreground", cell: (entry) => entry.roomNumber ?? "—" },
            { header: "Checked in", className: "tabular-nums text-muted-foreground", cell: (entry) => entry.checkedInAt ? formatDateTime(entry.checkedInAt) : "—" },
            { header: "Checked out", className: "tabular-nums text-muted-foreground", cell: (entry) => entry.checkedOutAt ? formatDateTime(entry.checkedOutAt) : "—" },
            { header: "Status", width: "140px", cell: (entry) => <ReportStatusPill status={entry.operationalStatus} /> },
          ]}
          mobileRow={(entry) => (
            <ListRow
              leading={<InitialsAvatar name={entry.guestName} />}
              title={entry.guestName}
              badge={<ReportStatusPill status={entry.operationalStatus} />}
              meta={
                <>
                  <span className="block">{[`Room ${entry.roomNumber ?? "—"}`, entry.companionCount > 0 ? `+${entry.companionCount}` : null].filter(Boolean).join(" · ")}</span>
                  <span className="block">In {entry.checkedInAt ? formatDateTime(entry.checkedInAt) : "—"}{entry.checkedOutAt ? ` · Out ${formatDateTime(entry.checkedOutAt)}` : ""}</span>
                </>
              }
            />
          )}
        />
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
