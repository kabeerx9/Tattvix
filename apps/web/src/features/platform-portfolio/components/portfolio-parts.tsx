// Shared pieces of the admin portfolio: room-status bar, setup pill, the
// per-property card used on organization detail, and the room types sheet.
// Everything here is aggregate data; no guest identity reaches these views.
import type { PlatformPortfolioProperty, PlatformPortfolioRoomCounts } from "@tattvix/contracts";
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
import { Button } from "@tattvix/ui/components/button";
import { cn } from "@tattvix/ui/lib/utils";
import { BedDouble, MapPin } from "lucide-react";
import { useState } from "react";

import { PhotoTile, StatusPill } from "@/components/design-system";
import { formatMoneyWholeRupees } from "@/lib/money";

import {
  formatLastActivity,
  formatPercent,
  formatRateRange,
  getMissingSetup,
  getOccupancyRecent,
  getOccupancyTonight,
  getSetupStatus,
  roomTypeLabel,
} from "../metrics";

const roomStatusSegments = [
  { key: "occupied", label: "occupied", className: "bg-chart-1" },
  { key: "ready", label: "ready", className: "bg-chart-4" },
  { key: "cleaning", label: "cleaning", className: "bg-chart-3" },
  { key: "maintenance", label: "maintenance", className: "bg-chart-5" },
] as const;

export function SetupPill({ property }: { property: PlatformPortfolioProperty }) {
  const status = getSetupStatus(property);
  return <StatusPill tone={status.tone}>{status.label}</StatusPill>;
}

export function SubscriptionPill({
  subscription,
}: {
  subscription: PlatformPortfolioProperty["organization"]["subscription"];
}) {
  switch (subscription.status) {
    case "PAID":
      return <StatusPill tone="success">Paid</StatusPill>;
    case "TRIALING":
      return (
        <StatusPill tone={subscription.daysLeft <= 14 ? "warning" : "neutral"}>
          Trial · {subscription.daysLeft}d
        </StatusPill>
      );
    case "EXPIRED":
      return <StatusPill tone="danger">Trial ended</StatusPill>;
    default:
      return <StatusPill tone="danger">No subscription</StatusPill>;
  }
}

export function roomStatusSummary(rooms: PlatformPortfolioRoomCounts) {
  if (!rooms.total) return "No rooms yet";
  return roomStatusSegments
    .filter((segment) => rooms[segment.key] > 0)
    .map((segment) => `${rooms[segment.key]} ${segment.label}`)
    .join(" · ");
}

/** One stacked bar for the room mix tonight, with a text legend beside it. */
export function RoomStatusBar({
  rooms,
  className,
}: {
  rooms: PlatformPortfolioRoomCounts;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Rooms tonight: ${roomStatusSummary(rooms)}`}
      >
        {rooms.total
          ? roomStatusSegments.map((segment) =>
              rooms[segment.key] ? (
                <span
                  key={segment.key}
                  className={segment.className}
                  style={{ width: `${(rooms[segment.key] / rooms.total) * 100}%` }}
                />
              ) : null,
            )
          : null}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
        {roomStatusSegments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2 rounded-full", segment.className)} />
            {rooms[segment.key]} {segment.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardFact({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-subtle-foreground">{label}</dt>
      <dd className="mt-0.5 text-[15px] leading-snug font-semibold tabular-nums wrap-anywhere">{value}</dd>
      {detail ? <dd className="text-xs text-subtle-foreground tabular-nums">{detail}</dd> : null}
    </div>
  );
}

export function PortfolioPropertyCard({ property }: { property: PlatformPortfolioProperty }) {
  const [showRoomTypes, setShowRoomTypes] = useState(false);
  const missing = getMissingSetup(property);

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card shadow-card">
      <div className="relative">
        <PhotoTile url={property.coverPhotoUrl} label="No photo yet" className="aspect-[16/9] w-full" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-card shadow-card">
            <SetupPill property={property} />
          </span>
          <span className="rounded-full bg-card shadow-card">
            <SubscriptionPill subscription={property.organization.subscription} />
          </span>
        </div>
      </div>
      <div className="grid flex-1 gap-4 p-5">
        <div className="min-w-0">
          <h3 className="text-base leading-snug font-semibold wrap-anywhere">{property.name}</h3>
          <p className="mt-1 flex min-w-0 items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            <span className="line-clamp-2 wrap-anywhere">{property.address || "No address yet"}</span>
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-3">
          <CardFact label="Rooms" value={property.rooms.total} detail={`${property.roomTypes.length} ${property.roomTypes.length === 1 ? "type" : "types"}`} />
          <CardFact label="Nightly" value={formatRateRange(property.rates)} detail={property.rates.avgMinor !== null ? `avg ${formatMoneyWholeRupees(property.rates.avgMinor)}` : undefined} />
          <CardFact label="Tonight" value={formatPercent(getOccupancyTonight(property))} detail={`${formatPercent(getOccupancyRecent(property))} over ${property.occupancy.recentNights}n`} />
        </dl>

        <RoomStatusBar rooms={property.rooms} />

        <dl className="grid grid-cols-3 gap-3 border-t border-border-soft pt-4">
          <CardFact label="In house" value={property.stays.inHouse} detail={`${property.stays.arrivalsPending} arriving`} />
          <CardFact label="Check-ins" value={property.stays.checkInsLast7Days} detail="last 7 days" />
          <CardFact label="Revenue" value={formatMoneyWholeRupees(property.revenueLast30DaysMinor)} detail="last 30 days" />
        </dl>

        {missing.length && property.isActive ? (
          <p className="text-xs text-warning">Missing {missing.join(", ")}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-subtle-foreground">{formatLastActivity(property.lastActivityAt)}</span>
          <Button variant="outline" size="sm" onClick={() => setShowRoomTypes(true)} disabled={!property.roomTypes.length}>
            <BedDouble />
            Room types & prices
          </Button>
        </div>
      </div>
      <RoomTypesSheet property={property} open={showRoomTypes} onOpenChange={setShowRoomTypes} />
    </article>
  );
}

export function RoomTypesSheet({
  property,
  open,
  onOpenChange,
}: {
  property: PlatformPortfolioProperty;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Room types & prices"
      description={`${property.name} · ${property.rooms.total} rooms`}
    >
      <ul className="grid gap-4">
        {property.roomTypes.map((roomType) => (
          <li key={roomType.name} className="flex min-w-0 gap-4">
            <PhotoTile url={roomType.photoUrl} className="size-20 shrink-0 rounded-xl" />
            <div className="grid min-w-0 flex-1 gap-1.5">
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <h3 className="min-w-0 truncate text-[15px] font-semibold">{roomTypeLabel(roomType.name)}</h3>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums">{formatRateRange(roomType.rates)}</span>
              </div>
              <p className="text-xs text-subtle-foreground tabular-nums">
                {roomType.rooms.total} {roomType.rooms.total === 1 ? "room" : "rooms"}
                {roomType.rates.avgMinor !== null ? ` · avg ${formatMoneyWholeRupees(roomType.rates.avgMinor)} a night` : ""}
              </p>
              <RoomStatusBar rooms={roomType.rooms} />
            </div>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
