import type {
  HotelQrTokenResponse,
  HotelStayListItem,
  HotelStayListQuery,
  OperationalStayStatus,
} from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tattvix/ui/components/select";
import { Link } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import {
  Clock3,
  Copy,
  QrCode,
  Search,
  UsersRound,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, Kpi, KpiStrip, PageHeader, Panel, PanelHeader, PanelSection, StatusPill } from "@/components/design-system";
import { useDebouncedValue } from "@/core/hooks/use-debounced-value";
import { hotelStayMutations } from "@/features/hotel-stays/mutations";
import { hotelStayQueries } from "@/features/hotel-stays/queries";
import { ApiError } from "@/lib/api";
import { getInitials } from "@/lib/initials";

const STATUS_FILTERS: {
  value: OperationalStayStatus | "__all__";
  label: string;
}[] = [
  { value: "__all__", label: "All statuses" },
  { value: "PENDING_CHECK_IN", label: "Pending check-in" },
  { value: "CHECKED_IN", label: "Checked in" },
  { value: "CHECKED_OUT", label: "Checked out" },
];

export function HotelStaysPage({
  organizationSlug,
  propertySlug,
}: {
  organizationSlug: string;
  propertySlug: string;
  propertyName: string;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    OperationalStayStatus | "__all__"
  >("__all__");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);

  const query: HotelStayListQuery = {
    ...(debouncedSearch.length >= 2 ? { search: debouncedSearch } : {}),
    ...(statusFilter !== "__all__" ? { operationalStatus: statusFilter } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };
  const hasActiveFilters = Boolean(
    query.search || query.operationalStatus || query.dateFrom || query.dateTo,
  );

  const { data } = useQuery({
    ...hotelStayQueries.list(organizationSlug, propertySlug, query),
    placeholderData: keepPreviousData,
  });
  const stays = data?.stays ?? [];

  const [qrToken, setQrToken] = useState<HotelQrTokenResponse | null>(null);
  const qrMutation = useMutation(hotelStayMutations.generateQr());

  function generateQr() {
    qrMutation.mutate(
      { organizationSlug, propertySlug },
      {
        onSuccess: (result) => {
          setQrToken(result);
          toast.success("New check-in QR generated");
        },
      },
    );
  }

  const qrError =
    qrMutation.error instanceof ApiError
      ? qrMutation.error.message
      : qrMutation.isError
        ? "The check-in QR could not be generated."
        : null;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6">
      <PageHeader
        title="Stays"
        actions={
          <Button onClick={generateQr} disabled={qrMutation.isPending}>
            <QrCode />
            {qrMutation.isPending ? "Generating..." : "Generate check-in QR"}
          </Button>
        }
      />

      {qrToken ? (
        <CheckInQrPanel qrToken={qrToken} />
      ) : qrError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {qrError}
        </p>
      ) : null}

      <KpiStrip>
        <Kpi icon={UsersRound} label={hasActiveFilters ? "Filtered results" : "All stays"} value={stays.length} />
        <Kpi icon={Clock3} label="Waiting" value={stays.filter((stay) => stay.operationalStatus === "PENDING_CHECK_IN").length} />
        <Kpi icon={UsersRound} label="In house" value={stays.filter((stay) => stay.operationalStatus === "CHECKED_IN").length} />
        <Kpi icon={UsersRound} label="Checked out" value={stays.filter((stay) => stay.operationalStatus === "CHECKED_OUT").length} />
      </KpiStrip>

      <Panel>
        <PanelHeader title="Check-ins" meta={stays.length} />
        <PanelSection>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative sm:w-[240px]">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search guest name"
                aria-label="Search guest name"
                className="pl-9"
              />
            </div>
            <Select
              items={STATUS_FILTERS}
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as OperationalStayStatus | "__all__")
              }
            >
              <SelectTrigger className="sm:w-[190px]" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                aria-label="From date"
                className="sm:w-[160px]"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                aria-label="To date"
                className="sm:w-[160px]"
              />
            </div>
          </div>
        </PanelSection>

        {stays.length ? (
          <div>
            {stays.map((stay) => (
              <StayRow
                key={stay.id}
                stay={stay}
                organizationSlug={organizationSlug}
                propertySlug={propertySlug}
              />
            ))}
          </div>
        ) : hasActiveFilters ? (
          <EmptyState
            icon={Search}
            title="No results for this search"
            description="Try a different name, or clear the status and date filters to see all submitted check-ins."
          />
        ) : (
          <EmptyState
            icon={UsersRound}
            title="No submitted check-ins yet"
            description="Generate the property QR. A guest will appear here only after reviewing and approving their identity package."
          />
        )}
      </Panel>
    </div>
  );
}

function CheckInQrPanel({ qrToken }: { qrToken: HotelQrTokenResponse }) {
  const checkInUrl =
    typeof window === "undefined"
      ? qrToken.checkInPath
      : `${window.location.origin}${qrToken.checkInPath}`;

  async function copyLink() {
    await navigator.clipboard.writeText(checkInUrl);
    toast.success("Check-in link copied");
  }

  return (
    <Panel className="grid gap-6 p-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
      <div className="grid place-items-center rounded-lg bg-muted p-5">
        <QRCodeSVG
          value={checkInUrl}
          size={180}
          level="M"
          bgColor="transparent"
          fgColor="currentColor"
          className="size-[180px] text-foreground"
          title={`Check-in QR for ${qrToken.property.name}`}
        />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">
          {qrToken.property.name} check-in QR
        </h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-subtle-foreground">
          Printing this code lets arriving guests open the consent flow. Creating
          another QR revokes this one immediately.
        </p>
        <div className="mt-5 flex gap-2">
          <Input value={checkInUrl} readOnly aria-label="Check-in URL" />
          <Button variant="outline" onClick={copyLink}>
            <Copy />
            Copy
          </Button>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="size-3.5" />
          QR expires {formatDateTime(qrToken.expiresAt)}
        </p>
      </div>
    </Panel>
  );
}

function StayRow({
  stay,
  organizationSlug,
  propertySlug,
}: {
  stay: HotelStayListItem;
  organizationSlug: string;
  propertySlug: string;
}) {
  return (
    <Link
      to="/hotel/$organizationSlug/$propertySlug/stays/$stayId"
      params={{ organizationSlug, propertySlug, stayId: stay.id }}
      className="flex min-h-11 items-center gap-3 border-t border-border-soft px-5 py-2 hover:bg-muted/50"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
          {getInitials(stay.guestName)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{stay.guestName}</span>
            <StayStatusPill stay={stay} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Submitted {stay.submittedAt ? formatDateTime(stay.submittedAt) : "—"}
            {stay.companionCount > 0 ? ` · +${stay.companionCount}` : ""}
            {stay.room ? ` · Room ${stay.room.number}` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}

function StayStatusPill({ stay }: { stay: HotelStayListItem }) {
  const status = stay.operationalStatus;
  return (
    <StatusPill tone={status === "PENDING_CHECK_IN" ? "warning" : status === "CHECKED_IN" ? "success" : "neutral"}>
      {status === "PENDING_CHECK_IN" ? "Waiting for a room" : status === "CHECKED_IN" ? "Checked in" : "Checked out"}
    </StatusPill>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
