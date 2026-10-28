// The hotel staff "Today" page (docs/adr/0002-airbnb-style-staff-shell.md):
// reservation pill tabs with counts over guest cards, a rail of rooms ready
// for check-in, housekeeping, and tonight's occupancy. Detail and actions
// open in a bottom sheet (phones) or dialog (tablet and up).
import type { HotelRoom, HotelStayListItem, PropertyPhotosResponse } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { PillTabs } from "@tattvix/ui/components/pill-tabs";
import { Rail } from "@tattvix/ui/components/rail";
import { Skeleton } from "@tattvix/ui/components/skeleton";
import { cn } from "@tattvix/ui/lib/utils";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BedDouble, BrushCleaning, DoorOpen, QrCode, Sparkles, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { InitialsAvatar, LargeTitle, SectionTitle } from "@/components/design-system";
import { hotelOperationsQueries } from "@/features/hotel-operations/queries";
import { getRoomTypePhotoUrl } from "@/features/property-photos/helpers";
import { propertyPhotoQueries } from "@/features/property-photos/queries";
import { hotelStayQueries } from "@/features/hotel-stays/queries";
import { formatMoneyWholeRupees } from "@/lib/money";

import { hotelOverviewQueries } from "../queries";
import {
  getDefaultReservationTab,
  getOccupancyTrend,
  getReadyRooms,
  getReservationGroups,
  getRoomStats,
  getStayCardAction,
  getStayStatus,
  localDayKey,
  type ReservationTab,
} from "../metrics";
import {
  formatDay,
  formatTime,
  partyLabel,
  RoomPhoto,
  RoomSheet,
  StaySheet,
  statusToneClassName,
  type TodayScope,
} from "./today-sheets";

const longDate = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });

const tabLabels: Record<ReservationTab, string> = {
  checkingOut: "Checking out",
  inHouse: "Checked in",
  arriving: "Arriving",
  checkedOut: "Checked out today",
};
const tabOrder: ReservationTab[] = ["checkingOut", "inHouse", "arriving", "checkedOut"];

export function HotelTodayPage({
  propertyName,
  firstName,
  ...scope
}: TodayScope & { propertyName: string; firstName?: string | null }) {
  const { organizationSlug, propertySlug } = scope;
  const { data: stayData } = useSuspenseQuery(hotelStayQueries.list(organizationSlug, propertySlug));
  const { data: roomData } = useSuspenseQuery(hotelOperationsQueries.rooms(organizationSlug, propertySlug));
  const { data: summary } = useSuspenseQuery(hotelOverviewQueries.summary(organizationSlug, propertySlug));
  const { data: photos } = useQuery(propertyPhotoQueries.list(organizationSlug, propertySlug));

  const today = new Date();
  const todayKey = localDayKey(today);
  const groups = getReservationGroups(stayData.stays, today);
  const [tab, setTab] = useState<ReservationTab>(() => getDefaultReservationTab(groups));
  const [stayId, setStayId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);
  const readyRooms = getReadyRooms(roomData.rooms);
  const params = { organizationSlug, propertySlug };
  const shown = groups[tab];

  return (
    <div className="grid gap-12">
      <LargeTitle
        title={firstName?.trim() ? `Welcome back, ${firstName.trim()}` : "Today"}
        meta={`${longDate.format(today)} · ${propertyName}`}
      />

      <section className="grid gap-4">
        <SectionTitle
          title="Your reservations"
          meta={summaryLine(groups.arriving.length, groups.checkingOut.length)}
        />
        <PillTabs
          label="Reservation status"
          value={tab}
          onValueChange={setTab}
          items={tabOrder.map((value) => ({ value, label: tabLabels[value], count: groups[value].length }))}
        />
        {shown.length ? (
          <Rail
            key={tab}
            role="tabpanel"
            aria-label={tabLabels[tab]}
            className="mt-1 auto-cols-[84%] sm:auto-cols-[46%] md:grid-flow-row md:grid-cols-2 md:overflow-visible lg:grid-cols-3 2xl:grid-cols-4"
          >
            {shown.map((stay, index) => (
              <ReservationCard
                key={stay.id}
                stay={stay}
                room={stay.room ? roomData.rooms.find((room) => room.id === stay.room!.id) : undefined}
                todayKey={todayKey}
                index={index}
                scope={scope}
                onOpen={() => setStayId(stay.id)}
              />
            ))}
          </Rail>
        ) : (
          <ReservationsEmpty tab={tab} params={params} />
        )}
      </section>

      <section className="grid gap-4">
        <SectionTitle
          title="Ready to check in"
          meta={
            readyRooms.length
              ? `${readyRooms.length} ${readyRooms.length === 1 ? "room is" : "rooms are"} clean and free tonight`
              : roomData.rooms.length
                ? "No room is ready right now"
                : "Add rooms to start checking guests in"
          }
          action={
            <Link
              to="/hotel/$organizationSlug/$propertySlug/rooms"
              params={params}
              className="text-sm font-semibold underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              All rooms
            </Link>
          }
        />
        {readyRooms.length ? (
          <Rail className="auto-cols-[62%] sm:auto-cols-[38%] md:auto-cols-[30%] lg:auto-cols-[calc((100%-48px)/5)]">
            {readyRooms.map((room, index) => (
              <ReadyRoomCard
                key={room.id}
                room={room}
                photos={photos}
                index={index}
                onOpen={() => setRoomId(room.id)}
              />
            ))}
          </Rail>
        ) : (
          <QuietEmpty
            icon={BedDouble}
            text={
              roomData.rooms.length
                ? "Rooms show up here once they are cleaned and marked ready."
                : "This property has no rooms yet."
            }
          />
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Housekeeping rooms={roomData.rooms} scope={scope} onOpenRoom={setRoomId} />
        <Tonight rooms={roomData.rooms} averagePercent={average(getOccupancyTrend(summary).map((entry) => entry.percent))} revenueMinor={summary.revenue?.totalMinor ?? null} />
      </section>

      <StaySheet
        scope={scope}
        stayId={stayId}
        stays={stayData.stays}
        rooms={roomData.rooms}
        photos={photos}
        onClose={() => setStayId(null)}
      />
      <RoomSheet scope={scope} roomId={roomId} rooms={roomData.rooms} photos={photos} onClose={() => setRoomId(null)} />
    </div>
  );
}

function summaryLine(waiting: number, leaving: number) {
  if (!waiting && !leaving) return "Nothing needs you right now";
  const parts = [];
  if (waiting) parts.push(`${waiting} waiting for a room`);
  if (leaving) parts.push(`${leaving} checking out`);
  return parts.join(" · ");
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function ReservationCard({
  stay,
  room,
  todayKey,
  index,
  scope,
  onOpen,
}: {
  stay: HotelStayListItem;
  room?: HotelRoom;
  todayKey: string;
  index: number;
  scope: TodayScope;
  onOpen: () => void;
}) {
  const status = getStayStatus(stay, todayKey);
  const action = getStayCardAction(stay, todayKey, scope);
  const detail =
    stay.operationalStatus === "PENDING_CHECK_IN"
      ? `${partyLabel(stay)} · checked in on their phone at ${formatTime(stay.submittedAt)}`
      : stay.operationalStatus === "CHECKED_OUT"
        ? `${partyLabel(stay)} · left at ${formatTime(stay.checkedOutAt)}`
        : `${partyLabel(stay)} · due out ${formatDay(stay.expectedCheckOutDate, todayKey, true)}`;

  return (
    <article
      className="enter-up flex min-w-0 flex-col rounded-card border border-border bg-card shadow-card"
      style={{ "--i": index } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={onOpen}
        className="press flex flex-1 flex-col rounded-t-card p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="flex items-start justify-between gap-3">
          <span className={cn("pt-1 text-sm font-semibold", statusToneClassName[status.tone])}>{status.label}</span>
          <InitialsAvatar name={stay.guestName} size="md" />
        </span>
        <span className="mt-1 block text-lg font-semibold tracking-tight wrap-anywhere">{stay.guestName}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {room ? `Room ${room.number}${room.roomType ? ` · ${room.roomType}` : ""}` : "No room yet"}
        </span>
        <span className="mt-3 block text-sm text-muted-foreground tabular-nums">{detail}</span>
      </button>
      <div className="border-t border-border-soft p-3">
        <Button
          variant={action === "view" ? "ghost" : "outline"}
          className="h-11 w-full rounded-xl text-[15px] font-semibold"
          onClick={onOpen}
        >
          {action === "assignRoom" ? "Assign room" : action === "checkOut" ? "Check out" : "Details"}
        </Button>
      </div>
    </article>
  );
}

function ReadyRoomCard({
  room,
  photos,
  index,
  onOpen,
}: {
  room: HotelRoom;
  photos?: PropertyPhotosResponse;
  index: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="press enter-up min-w-0 self-start rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{ "--i": index } as React.CSSProperties}
    >
      <RoomPhoto url={getRoomTypePhotoUrl(photos, room.roomType)} className="aspect-square w-full rounded-xl" />
      <span className="mt-2.5 block text-[15px] font-semibold tabular-nums">Room {room.number}</span>
      <span className="block truncate text-sm text-muted-foreground">
        {[room.roomType, room.floor ? `Floor ${room.floor}` : null].filter(Boolean).join(" · ") || "Ready"}
      </span>
      {room.nightlyRateMinor !== null ? (
        <span className="mt-0.5 block text-sm tabular-nums">
          <span className="font-semibold">{formatMoneyWholeRupees(room.nightlyRateMinor)}</span>{" "}
          <span className="text-muted-foreground">night</span>
        </span>
      ) : (
        <span className="mt-0.5 block text-sm text-muted-foreground">No nightly rate yet</span>
      )}
    </button>
  );
}

const emptyCopy: Record<ReservationTab, { icon: LucideIcon; title: string; text: string }> = {
  arriving: {
    icon: QrCode,
    title: "No one is waiting for a room",
    text: "Guests appear here as soon as they scan your check-in QR and share their ID.",
  },
  checkingOut: {
    icon: DoorOpen,
    title: "No checkouts due today",
    text: "Guests due out today, and anyone overdue, show up here.",
  },
  inHouse: {
    icon: BedDouble,
    title: "No guests are staying right now",
    text: "Checked-in guests appear here with their room and due-out date.",
  },
  checkedOut: {
    icon: Sparkles,
    title: "No checkouts yet today",
    text: "Guests who leave today are listed here so housekeeping can follow.",
  },
};

function ReservationsEmpty({
  tab,
  params,
}: {
  tab: ReservationTab;
  params: { organizationSlug: string; propertySlug: string };
}) {
  const copy = emptyCopy[tab];
  const Icon = copy.icon;
  return (
    <div role="tabpanel" className="mt-1 grid place-items-center gap-3 rounded-card bg-muted/60 px-6 py-10 text-center">
      <Icon aria-hidden className="size-6 text-muted-foreground" strokeWidth={1.5} />
      <div className="max-w-sm">
        <p className="text-[15px] font-semibold">{copy.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{copy.text}</p>
      </div>
      <Link
        to="/hotel/$organizationSlug/$propertySlug/stays"
        params={params}
        className="text-sm font-semibold underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
      >
        {tab === "arriving" ? "Show the check-in QR" : "View all stays"}
      </Link>
    </div>
  );
}

function QuietEmpty({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-muted/60 px-5 py-5 text-sm text-muted-foreground">
      <Icon className="size-5 shrink-0" />
      {text}
    </div>
  );
}

function Housekeeping({
  rooms,
  scope,
  onOpenRoom,
}: {
  rooms: HotelRoom[];
  scope: TodayScope;
  onOpenRoom: (roomId: number) => void;
}) {
  const toClean = rooms.filter((room) => room.isActive && room.status === "CLEANING");
  const outOfService = rooms.filter((room) => room.isActive && room.status === "MAINTENANCE");
  const list = [...toClean, ...outOfService];
  return (
    <div className="rounded-card border border-border bg-card p-5 shadow-card md:p-6">
      <h2 className="text-lg font-semibold tracking-tight">Housekeeping</h2>
      <p className="text-sm text-muted-foreground">
        {toClean.length
          ? `${toClean.length} ${toClean.length === 1 ? "room" : "rooms"} to clean`
          : "Every room is clean"}
        {outOfService.length ? ` · ${outOfService.length} in maintenance` : ""}
      </p>
      {list.length ? (
        <ul className="mt-3 divide-y divide-border-soft">
          {list.map((room) => (
            <li key={room.id} className="flex min-h-14 items-center gap-3 py-1">
              <span className="w-12 shrink-0 text-[17px] font-semibold tabular-nums">{room.number}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px]">{room.roomType || `Room ${room.number}`}</span>
                <span
                  className={cn(
                    "block text-xs font-medium",
                    room.status === "CLEANING" ? "text-warning" : "text-destructive",
                  )}
                >
                  {room.status === "CLEANING" ? "Cleaning" : "Maintenance"}
                </span>
              </span>
              {scope.canManageRooms ? (
                <Button variant="outline" className="h-9 rounded-full px-4 text-sm" onClick={() => onOpenRoom(room.id)}>
                  {room.status === "CLEANING" ? "Mark ready" : "Update"}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 flex items-center gap-3 text-sm text-muted-foreground">
          <BrushCleaning className="size-5" />
          Nothing waiting on housekeeping.
        </div>
      )}
    </div>
  );
}

function Tonight({
  rooms,
  averagePercent,
  revenueMinor,
}: {
  rooms: HotelRoom[];
  averagePercent: number | null;
  revenueMinor: number | null;
}) {
  const stats = getRoomStats(rooms);
  const share = (value: number) => (stats.active ? `${(value / stats.active) * 100}%` : "0%");
  return (
    <div className="rounded-card border border-border bg-card p-5 shadow-card md:p-6">
      <h2 className="text-lg font-semibold tracking-tight">Tonight</h2>
      <p className="text-sm text-muted-foreground tabular-nums">
        {stats.active ? `${stats.occupied} of ${stats.active} rooms occupied` : "No active rooms yet"}
      </p>
      <div className="mt-5 flex items-end gap-2">
        <span className="text-[44px] leading-none font-bold tracking-tight tabular-nums">{stats.occupancyPercent}%</span>
        <span className="pb-1.5 text-sm text-muted-foreground">occupancy</span>
      </div>
      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className="bg-chart-1" style={{ width: share(stats.occupied) }} />
        <span className="bg-chart-3" style={{ width: share(stats.cleaning) }} />
        <span className="bg-chart-5" style={{ width: share(stats.maintenance) }} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground tabular-nums">
        {stats.vacant} ready · {stats.cleaning} cleaning · {stats.maintenance} maintenance
      </p>
      {averagePercent !== null || revenueMinor !== null ? (
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border-soft pt-4">
          {averagePercent !== null ? (
            <div>
              <dt className="text-xs text-subtle-foreground">Average, last 7 days</dt>
              <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{averagePercent}%</dd>
            </div>
          ) : null}
          {revenueMinor !== null ? (
            <div>
              <dt className="text-xs text-subtle-foreground">Revenue, last 7 days</dt>
              <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{formatMoneyWholeRupees(revenueMinor)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

/** Route pending state: the page's shape, so loading looks intentional. */
export function HotelTodaySkeleton() {
  return (
    <div className="grid gap-12" aria-busy="true" aria-label="Loading today">
      <div className="grid gap-3 md:pt-0">
        <Skeleton className="h-9 w-72 max-w-full rounded-lg" />
        <Skeleton className="h-4 w-56 max-w-full rounded-md" />
      </div>
      <div className="grid gap-4">
        <Skeleton className="h-6 w-48 rounded-md" />
        <div className="flex gap-2 overflow-hidden">
          {[120, 160, 100, 150].map((width) => (
            <Skeleton key={width} className="h-10 shrink-0 rounded-full" style={{ width }} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className={cn("h-52 rounded-card", key > 0 && "max-md:hidden")} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[0, 1, 2, 3, 4].map((key) => (
          <Skeleton key={key} className={cn("aspect-square rounded-xl", key > 1 && "max-md:hidden")} />
        ))}
      </div>
    </div>
  );
}
