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

import { EmptyState, MetricCard, PageHeader, Surface } from "@/components/design-system";
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
  propertyName,
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
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <PageHeader
        eyebrow={propertyName}
        title="Reports"
        description="Operational reports only — names, dates, rooms, and statuses. No document numbers, no payment data."
      />

      <Surface className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
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
      </Surface>

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
  return (
    <div className="flex items-start justify-between gap-3 border-b p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
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
    <section className="grid gap-4">
      <div className="flex items-center gap-2">
        <Gauge className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Occupancy — today</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={BedDouble}
          label="Occupied / active rooms"
          value={`${occupancy.occupiedRooms} / ${occupancy.activeRooms}`}
          detail="Rooms currently occupied out of active inventory"
        />
        <MetricCard
          icon={BedDouble}
          label="Vacant"
          value={String(occupancy.statusCounts.VACANT)}
          detail="Ready to assign"
        />
        <MetricCard
          icon={BedDouble}
          label="Cleaning"
          value={String(occupancy.statusCounts.CLEANING)}
          detail="Turned over, not yet vacant"
        />
        <MetricCard
          icon={BedDouble}
          label="Maintenance"
          value={String(occupancy.statusCounts.MAINTENANCE)}
          detail="Out of service"
        />
      </div>
    </section>
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
    <Surface>
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
    </Surface>
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
    <Surface>
      <SectionHeader
        title="Current in-house"
        description="Guests who are checked in and currently occupy a room."
        icon={UserRound}
      />
      {entries.length ? (
        <div className="divide-y">
          {entries.map((entry) => (
            <div
              key={entry.stayId}
              className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6"
            >
              <div>
                <p className="text-sm font-semibold">{entry.guestName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Checked in {entry.checkedInAt ? formatDateTime(entry.checkedInAt) : "—"}
                </p>
              </div>
              {entry.roomNumber ? (
                <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  <BedDouble className="size-3" />
                  Room {entry.roomNumber}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={UserRound}
          title="No one is checked in"
          description="Guests appear here once reception assigns a room and confirms check-in."
        />
      )}
    </Surface>
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
    <Surface>
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
              <tr className="border-b text-xs text-muted-foreground">
                <th className="p-4 font-medium sm:p-5">Guest</th>
                <th className="p-4 font-medium sm:p-5">Companions</th>
                <th className="p-4 font-medium sm:p-5">Room</th>
                <th className="p-4 font-medium sm:p-5">Checked in</th>
                <th className="p-4 font-medium sm:p-5">Checked out</th>
                <th className="p-4 font-medium sm:p-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((entry) => (
                <tr key={entry.stayId}>
                  <td className="p-4 font-medium sm:p-5">{entry.guestName}</td>
                  <td className="p-4 text-muted-foreground sm:p-5">
                    {entry.companionCount}
                  </td>
                  <td className="p-4 text-muted-foreground sm:p-5">
                    {entry.roomNumber ?? "—"}
                  </td>
                  <td className="p-4 text-muted-foreground sm:p-5">
                    {entry.checkedInAt ? formatDateTime(entry.checkedInAt) : "—"}
                  </td>
                  <td className="p-4 text-muted-foreground sm:p-5">
                    {entry.checkedOutAt ? formatDateTime(entry.checkedOutAt) : "—"}
                  </td>
                  <td className="p-4 text-muted-foreground sm:p-5">
                    {formatStatus(entry.operationalStatus)}
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
    </Surface>
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
