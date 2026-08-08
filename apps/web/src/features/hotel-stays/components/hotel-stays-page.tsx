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
  ArrowRight,
  CheckCircle2,
  Clock3,
  Copy,
  QrCode,
  Search,
  ShieldOff,
  UsersRound,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, Surface } from "@/components/design-system";
import { useDebouncedValue } from "@/core/hooks/use-debounced-value";
import { hotelStayMutations } from "@/features/hotel-stays/mutations";
import { hotelStayQueries } from "@/features/hotel-stays/queries";
import { ApiError } from "@/lib/api";

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
  propertyName,
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
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <PageHeader
        eyebrow={propertyName}
        title="Guest stays"
        description="Start walk-in check-ins with a property QR and review only identity packages guests explicitly submit."
        action={
          <Button size="lg" onClick={generateQr} disabled={qrMutation.isPending}>
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
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {qrError}
        </p>
      ) : null}

      <Surface>
        <div className="flex flex-col gap-4 border-b p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Submitted check-ins</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Identity access is checked again every time a stay or document is opened.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {stays.length} stay{stays.length === 1 ? "" : "s"}
            </p>
          </div>

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
        </div>

        {stays.length ? (
          <div className="divide-y">
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
          <div className="grid place-items-center gap-4 p-8 text-center sm:p-12">
            <span className="grid size-12 place-items-center rounded-xl bg-muted">
              <Search className="size-6" />
            </span>
            <div className="max-w-md">
              <h3 className="text-base font-semibold">No results for this search</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Try a different name, or clear the status and date filters to
                see all submitted check-ins.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid place-items-center gap-4 p-8 text-center sm:p-12">
            <span className="grid size-12 place-items-center rounded-xl bg-muted">
              <UsersRound className="size-6" />
            </span>
            <div className="max-w-md">
              <h3 className="text-base font-semibold">No submitted check-ins yet</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Generate the property QR. A guest will appear here only after
                reviewing and approving their identity package.
              </p>
            </div>
          </div>
        )}
      </Surface>
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
    <Surface className="grid gap-6 p-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
      <div className="grid place-items-center rounded-2xl bg-card p-5 ring-1 ring-border">
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
        <p className="app-kicker">Ready to display</p>
        <h2 className="mt-2 text-xl font-semibold">
          {qrToken.property.name} check-in QR
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
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
    </Surface>
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
    <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
          {stay.identityAccess.isActive ? (
            <CheckCircle2 className="size-5 text-primary" />
          ) : (
            <ShieldOff className="size-5 text-muted-foreground" />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{stay.guestName}</h3>
            <StatusPill stay={stay} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Submitted {stay.submittedAt ? formatDateTime(stay.submittedAt) : "—"}
            {" · "}
            {stay.companionCount} companion{stay.companionCount === 1 ? "" : "s"}
            {stay.room ? ` · Room ${stay.room.number}` : ""}
          </p>
        </div>
      </div>
      <Button
        nativeButton={false}
        variant="ghost"
        render={
          <Link
            to="/hotel/$organizationSlug/$propertySlug/stays/$stayId"
            params={{ organizationSlug, propertySlug, stayId: stay.id }}
          />
        }
      >
        Review stay
        <ArrowRight />
      </Button>
    </div>
  );
}

function StatusPill({ stay }: { stay: HotelStayListItem }) {
  const label =
    stay.operationalStatus === "CHECKED_IN"
      ? "Checked in"
      : stay.operationalStatus === "CHECKED_OUT"
        ? "Checked out"
        : stay.identityAccess.isActive
          ? "Pending check-in"
          : stay.identityAccess.reason === "REVOKED"
            ? "Consent revoked"
            : "Identity expired";
  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {label}
    </span>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
