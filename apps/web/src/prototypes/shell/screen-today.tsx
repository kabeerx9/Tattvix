// The hotel staff "Today" dashboard (ADR 0002), rendered three ways over
// local mock state. Grouping and status copy come from the production
// metrics helpers; actions update local state only.
import type { HotelRoom, HotelStayListItem } from "@tattvix/contracts";
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
import { Button } from "@tattvix/ui/components/button";
import { PillTabs } from "@tattvix/ui/components/pill-tabs";
import { Rail } from "@tattvix/ui/components/rail";
import { cn } from "@tattvix/ui/lib/utils";
import { BedDouble, BrushCleaning, Check, DoorOpen, QrCode, Sparkles, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { InitialsAvatar, LargeTitle, SectionTitle } from "@/components/design-system";
import {
  getDefaultReservationTab,
  getReadyRooms,
  getReservationGroups,
  getRoomStats,
  getStayCardAction,
  getStayStatus,
  localDayKey,
  type ReservationTab,
  type StayStatusTone,
} from "@/features/hotel-overview/metrics";
import { formatMoneyWholeRupees } from "@/lib/money";

import { notBuilt, useLastDefined } from "./common";
import {
  roomTypePhotos,
  staffUser,
  todayOccupancy7Days,
  todayProperty,
  todayRevenue7DaysMinor,
  todayRooms,
  todayStays,
} from "./data";

export type TodayLayout = "airy" | "workbench" | "cover";

const longDate = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });
const dayFormat = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });
const timeFormat = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

const tabLabels: Record<ReservationTab, string> = {
  checkingOut: "Checking out",
  inHouse: "Currently hosting",
  arriving: "Arriving",
  checkedOut: "Checked out today",
};
const tabOrder: ReservationTab[] = ["checkingOut", "inHouse", "arriving", "checkedOut"];

const toneClassName: Record<StayStatusTone, string> = {
  warning: "text-warning",
  danger: "text-destructive",
  primary: "text-primary",
  muted: "text-muted-foreground",
};

const scope = { canAssign: true, canCheckout: true };

function formatDay(key: string | null, todayKey: string) {
  if (!key) return "—";
  if (key === todayKey) return "today";
  return dayFormat.format(new Date(`${key}T12:00:00`));
}
const formatTime = (iso: string | null) => (iso ? timeFormat.format(new Date(iso)) : "—");
const partyLabel = (stay: HotelStayListItem) => `${stay.companionCount + 1} ${stay.companionCount ? "guests" : "guest"}`;

function useToday() {
  const [stays, setStays] = useState(todayStays);
  const [rooms, setRooms] = useState(todayRooms);
  const today = useMemo(() => new Date(), []);
  const todayKey = localDayKey(today);
  const groups = getReservationGroups(stays, today);
  const [tab, setTab] = useState<ReservationTab>(() => getDefaultReservationTab(getReservationGroups(todayStays, today)));
  const [stayId, setStayId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);

  function assignRoom(stayIdToAssign: string, room: HotelRoom) {
    const nowIso = new Date().toISOString();
    setStays((current) =>
      current.map((stay) =>
        stay.id === stayIdToAssign
          ? { ...stay, operationalStatus: "CHECKED_IN", room: { id: room.id, number: room.number }, checkedInAt: nowIso, expectedCheckOutDate: localDayKey(new Date(Date.now() + 2 * 86_400_000)) }
          : stay,
      ),
    );
    setRooms((current) => current.map((entry) => (entry.id === room.id ? { ...entry, status: "OCCUPIED" } : entry)));
    const guest = stays.find((stay) => stay.id === stayIdToAssign);
    toast.success(`${guest?.guestName ?? "Guest"} checked in to room ${room.number}`);
  }

  function checkOut(stayIdToClose: string) {
    const stay = stays.find((entry) => entry.id === stayIdToClose);
    const nowIso = new Date().toISOString();
    setStays((current) =>
      current.map((entry) => (entry.id === stayIdToClose ? { ...entry, operationalStatus: "CHECKED_OUT", status: "CLOSED", checkedOutAt: nowIso, closedAt: nowIso } : entry)),
    );
    if (stay?.room) setRooms((current) => current.map((entry) => (entry.id === stay.room!.id ? { ...entry, status: "CLEANING" } : entry)));
    toast.success(`${stay?.guestName ?? "Guest"} checked out`, { description: stay?.room ? `Room ${stay.room.number} sent to housekeeping` : undefined });
  }

  function markReady(id: number) {
    const room = rooms.find((entry) => entry.id === id);
    setRooms((current) => current.map((entry) => (entry.id === id ? { ...entry, status: "VACANT" } : entry)));
    toast.success(`Room ${room?.number} is ready`);
  }

  return { stays, rooms, todayKey, today, groups, tab, setTab, stayId, setStayId, roomId, setRoomId, assignRoom, checkOut, markReady, readyRooms: getReadyRooms(rooms) };
}

type Model = ReturnType<typeof useToday>;

export function TodayScreen({ layout }: { layout: TodayLayout }) {
  const model = useToday();
  return (
    <>
      {layout === "airy" ? <Airy model={model} /> : null}
      {layout === "workbench" ? <Workbench model={model} /> : null}
      {layout === "cover" ? <Cover model={model} /> : null}
      <StaySheet model={model} />
      <RoomSheet model={model} />
    </>
  );
}

function summaryLine(model: Model) {
  const waiting = model.groups.arriving.length;
  const leaving = model.groups.checkingOut.length;
  if (!waiting && !leaving) return "Nothing needs you right now";
  return [waiting ? `${waiting} waiting for a room` : null, leaving ? `${leaving} checking out` : null].filter(Boolean).join(" · ");
}

function Tabs({ model }: { model: Model }) {
  return (
    <PillTabs
      label="Reservation status"
      value={model.tab}
      onValueChange={model.setTab}
      items={tabOrder.map((value) => ({ value, label: tabLabels[value], count: model.groups[value].length }))}
    />
  );
}

function Reservations({ model, gridClassName }: { model: Model; gridClassName: string }) {
  const shown = model.groups[model.tab];
  if (!shown.length) return <ReservationsEmpty tab={model.tab} />;
  return (
    <Rail key={model.tab} role="tabpanel" aria-label={tabLabels[model.tab]} className={cn("mt-1", gridClassName)}>
      {shown.map((stay, index) => (
        <ReservationCard key={stay.id} stay={stay} model={model} index={index} />
      ))}
    </Rail>
  );
}

function ReservationCard({ stay, model, index }: { stay: HotelStayListItem; model: Model; index: number }) {
  const room = stay.room ? model.rooms.find((entry) => entry.id === stay.room!.id) : undefined;
  const status = getStayStatus(stay, model.todayKey);
  const action = getStayCardAction(stay, model.todayKey, scope);
  const detail =
    stay.operationalStatus === "PENDING_CHECK_IN"
      ? `${partyLabel(stay)} · checked in on their phone at ${formatTime(stay.submittedAt)}`
      : stay.operationalStatus === "CHECKED_OUT"
        ? `${partyLabel(stay)} · left at ${formatTime(stay.checkedOutAt)}`
        : `${partyLabel(stay)} · due out ${formatDay(stay.expectedCheckOutDate, model.todayKey)}`;
  return (
    <article className="enter-up flex min-w-0 flex-col rounded-card border border-border bg-card shadow-card" style={{ "--i": index } as React.CSSProperties}>
      <button
        type="button"
        onClick={() => model.setStayId(stay.id)}
        className="press flex flex-1 flex-col rounded-t-card p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="flex items-start justify-between gap-3">
          <span className={cn("pt-1 text-sm font-semibold", toneClassName[status.tone])}>{status.label}</span>
          <InitialsAvatar name={stay.guestName} size="md" />
        </span>
        <span className="mt-1 block text-lg font-semibold tracking-tight wrap-anywhere">{stay.guestName}</span>
        <span className="block truncate text-[15px] text-muted-foreground">
          {room ? `Room ${room.number} · ${room.roomType}` : "No room yet"}
        </span>
        <span className="mt-3 block text-sm text-muted-foreground tabular-nums">{detail}</span>
      </button>
      <div className="border-t border-border-soft p-3">
        <Button
          variant={action === "view" ? "ghost" : "outline"}
          className="h-11 w-full rounded-xl text-[15px] font-semibold"
          onClick={() => model.setStayId(stay.id)}
        >
          {action === "assignRoom" ? "Assign room" : action === "checkOut" ? "Check out" : "Details"}
        </Button>
      </div>
    </article>
  );
}

function RoomPhoto({ room, className }: { room: HotelRoom; className?: string }) {
  const url = roomTypePhotos[room.roomType];
  return url ? (
    <img src={url} alt="" loading="lazy" decoding="async" className={cn("bg-muted object-cover", className)} />
  ) : (
    <div aria-hidden className={cn("grid place-items-center bg-muted text-subtle-foreground", className)}>
      <BedDouble className="size-7" strokeWidth={1.5} />
    </div>
  );
}

function ReadyRooms({ model, railClassName }: { model: Model; railClassName: string }) {
  if (!model.readyRooms.length) return <QuietEmpty icon={BedDouble} text="Rooms show up here once they are cleaned and marked ready." />;
  return (
    <Rail className={railClassName}>
      {model.readyRooms.map((room, index) => (
        <button
          key={room.id}
          type="button"
          onClick={() => model.setRoomId(room.id)}
          className="press enter-up min-w-0 self-start rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{ "--i": index } as React.CSSProperties}
        >
          <RoomPhoto room={room} className="aspect-square w-full rounded-xl" />
          <span className="mt-2.5 block text-[15px] font-semibold tabular-nums">Room {room.number}</span>
          <span className="block truncate text-sm text-muted-foreground">{room.roomType} · Floor {room.floor}</span>
          {room.nightlyRateMinor !== null ? (
            <span className="mt-0.5 block text-sm tabular-nums">
              <span className="font-semibold">{formatMoneyWholeRupees(room.nightlyRateMinor)}</span> <span className="text-muted-foreground">night</span>
            </span>
          ) : null}
        </button>
      ))}
    </Rail>
  );
}

function readyMeta(model: Model) {
  const count = model.readyRooms.length;
  return count ? `${count} ${count === 1 ? "room is" : "rooms are"} clean and free tonight` : "No room is ready right now";
}

function AllRoomsLink() {
  return (
    <button
      type="button"
      onClick={() => notBuilt("Rooms")}
      className="text-sm font-semibold underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
    >
      All rooms
    </button>
  );
}

const emptyCopy: Record<ReservationTab, { icon: LucideIcon; title: string; text: string }> = {
  arriving: { icon: QrCode, title: "No one is waiting for a room", text: "Guests appear here as soon as they scan your check-in QR and share their ID." },
  checkingOut: { icon: DoorOpen, title: "No checkouts due today", text: "Guests due out today, and anyone overdue, show up here." },
  inHouse: { icon: BedDouble, title: "No guests are staying right now", text: "Checked-in guests appear here with their room and due-out date." },
  checkedOut: { icon: Sparkles, title: "No checkouts yet today", text: "Guests who leave today are listed here so housekeeping can follow." },
};

function ReservationsEmpty({ tab }: { tab: ReservationTab }) {
  const copy = emptyCopy[tab];
  const Icon = copy.icon;
  return (
    <div role="tabpanel" className="mt-1 grid place-items-center gap-3 rounded-card bg-muted/60 px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-background text-muted-foreground shadow-card">
        <Icon className="size-5" />
      </span>
      <div className="max-w-sm">
        <p className="text-[15px] font-semibold">{copy.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{copy.text}</p>
      </div>
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

function Housekeeping({ model, className }: { model: Model; className?: string }) {
  const toClean = model.rooms.filter((room) => room.isActive && room.status === "CLEANING");
  const outOfService = model.rooms.filter((room) => room.isActive && room.status === "MAINTENANCE");
  const list = [...toClean, ...outOfService];
  return (
    <div className={cn("rounded-card border border-border bg-card p-5 shadow-card md:p-6", className)}>
      <h2 className="text-lg font-semibold tracking-tight">Housekeeping</h2>
      <p className="text-sm text-muted-foreground">
        {toClean.length ? `${toClean.length} ${toClean.length === 1 ? "room" : "rooms"} to clean` : "Every room is clean"}
        {outOfService.length ? ` · ${outOfService.length} in maintenance` : ""}
      </p>
      {list.length ? (
        <ul className="mt-3 divide-y divide-border-soft">
          {list.map((room) => (
            <li key={room.id} className="flex min-h-14 items-center gap-3 py-1">
              <span
                className={cn(
                  "grid h-10 min-w-10 place-items-center rounded-xl px-2 text-sm font-semibold tabular-nums",
                  room.status === "CLEANING" ? "bg-warning-tint text-warning" : "bg-destructive-tint text-destructive",
                )}
              >
                {room.number}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px]">{room.roomType}</span>
                <span className="block text-xs text-subtle-foreground">{room.status === "CLEANING" ? "Cleaning" : "Maintenance"}</span>
              </span>
              <Button variant="outline" className="h-9 rounded-full px-4 text-sm" onClick={() => model.setRoomId(room.id)}>
                {room.status === "CLEANING" ? "Mark ready" : "Update"}
              </Button>
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

function Tonight({ model, className }: { model: Model; className?: string }) {
  const stats = getRoomStats(model.rooms);
  const share = (value: number) => (stats.active ? `${(value / stats.active) * 100}%` : "0%");
  return (
    <div className={cn("rounded-card border border-border bg-card p-5 shadow-card md:p-6", className)}>
      <h2 className="text-lg font-semibold tracking-tight">Tonight</h2>
      <p className="text-sm text-muted-foreground tabular-nums">{stats.occupied} of {stats.active} rooms occupied</p>
      <div className="mt-5 flex items-end gap-2">
        <span className="text-[44px] leading-none font-bold tracking-tight tabular-nums">{stats.occupancyPercent}%</span>
        <span className="pb-1.5 text-sm text-muted-foreground">occupancy</span>
      </div>
      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className="bg-chart-1" style={{ width: share(stats.occupied) }} />
        <span className="bg-chart-4" style={{ width: share(stats.vacant) }} />
        <span className="bg-chart-3" style={{ width: share(stats.cleaning) }} />
        <span className="bg-chart-5" style={{ width: share(stats.maintenance) }} />
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground tabular-nums">
        {[
          { label: "occupied", value: stats.occupied, className: "bg-chart-1" },
          { label: "ready", value: stats.vacant, className: "bg-chart-4" },
          { label: "cleaning", value: stats.cleaning, className: "bg-chart-3" },
          { label: "maintenance", value: stats.maintenance, className: "bg-chart-5" },
        ].map((entry) => (
          <li key={entry.label} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2 rounded-full", entry.className)} />
            {entry.value} {entry.label}
          </li>
        ))}
      </ul>
      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border-soft pt-4">
        <div>
          <dt className="text-xs text-subtle-foreground">Average, last 7 days</dt>
          <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{todayOccupancy7Days}%</dd>
        </div>
        <div>
          <dt className="text-xs text-subtle-foreground">Revenue, last 7 days</dt>
          <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{formatMoneyWholeRupees(todayRevenue7DaysMinor)}</dd>
        </div>
      </dl>
    </div>
  );
}

const reservationGrid = "auto-cols-[84%] sm:auto-cols-[46%] md:grid-flow-row md:grid-cols-2 md:overflow-visible lg:grid-cols-3 2xl:grid-cols-4";
const readyRail = "auto-cols-[62%] sm:auto-cols-[38%] md:auto-cols-[30%] lg:auto-cols-[calc((100%-48px)/5)]";

// ---------- Airy (Host): the ADR 0002 Today, one column ----------

function Airy({ model }: { model: Model }) {
  return (
    <div className="mx-auto grid w-full grid-cols-1 max-w-[1400px] gap-12">
      <LargeTitle title={`Welcome back, ${staffUser.firstName}`} meta={`${longDate.format(model.today)} · ${todayProperty.name}`} />
      <section className="grid grid-cols-1 gap-4">
        <SectionTitle title="Your reservations" meta={summaryLine(model)} />
        <Tabs model={model} />
        <Reservations model={model} gridClassName={reservationGrid} />
      </section>
      <section className="grid grid-cols-1 gap-4">
        <SectionTitle title="Ready to check in" meta={readyMeta(model)} action={<AllRoomsLink />} />
        <ReadyRooms model={model} railClassName={readyRail} />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Housekeeping model={model} />
        <Tonight model={model} />
      </section>
    </div>
  );
}

// ---------- Workbench (Ledger): main column + side column ----------

function Workbench({ model }: { model: Model }) {
  return (
    <div className="mx-auto grid w-full grid-cols-1 max-w-[1400px] gap-8">
      <LargeTitle title="Today" meta={`${longDate.format(model.today)} · ${summaryLine(model)}`} />
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6">
        <div className="grid min-w-0 grid-cols-1 content-start gap-10">
          <section className="grid grid-cols-1 gap-4">
            <SectionTitle title="Reservations" />
            <Tabs model={model} />
            <Reservations model={model} gridClassName="auto-cols-[84%] sm:auto-cols-[46%] md:grid-flow-row md:grid-cols-2 md:overflow-visible 2xl:grid-cols-3" />
          </section>
          <section className="grid grid-cols-1 gap-4">
            <SectionTitle title="Ready to check in" meta={readyMeta(model)} action={<AllRoomsLink />} />
            <ReadyRooms model={model} railClassName="auto-cols-[62%] sm:auto-cols-[38%] md:auto-cols-[30%] xl:auto-cols-[calc((100%-36px)/4)]" />
          </section>
        </div>
        <aside className="grid content-start gap-6 md:grid-cols-2 xl:grid-cols-1">
          <Tonight model={model} />
          <Housekeeping model={model} />
        </aside>
      </div>
    </div>
  );
}

// ---------- Cover (Concierge): property photo header ----------

function Cover({ model }: { model: Model }) {
  return (
    <div className="mx-auto grid w-full grid-cols-1 max-w-[1320px] gap-10">
      <header className="relative isolate overflow-hidden rounded-card">
        <img src={todayProperty.cover} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/45 to-black/10" />
        <div className="flex min-h-[200px] flex-col justify-end gap-1 p-5 text-white sm:min-h-[240px] sm:p-8">
          <p className="text-[15px] text-white/85">{longDate.format(model.today)} · {todayProperty.name}</p>
          <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.03em] md:text-[38px]">Good afternoon, {staffUser.firstName}</h1>
          <p className="mt-1 text-[15px] font-medium text-white">{summaryLine(model)}</p>
        </div>
      </header>
      <section className="grid grid-cols-1 gap-4">
        <SectionTitle title="Your reservations" />
        <Tabs model={model} />
        <Reservations model={model} gridClassName={reservationGrid} />
      </section>
      <section className="grid grid-cols-1 gap-4">
        <SectionTitle title="Ready to check in" meta={readyMeta(model)} action={<AllRoomsLink />} />
        <ReadyRooms model={model} railClassName={readyRail} />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Tonight model={model} />
        <Housekeeping model={model} />
      </section>
    </div>
  );
}

// ---------- Sheets ----------

function StaySheet({ model }: { model: Model }) {
  const stay = useLastDefined(model.stays.find((entry) => entry.id === model.stayId));
  const [choice, setChoice] = useState<number | null>(null);
  const open = model.stayId !== null;
  const close = () => {
    model.setStayId(null);
    setChoice(null);
  };
  if (!stay) return null;
  const action = getStayCardAction(stay, model.todayKey, scope);
  const status = getStayStatus(stay, model.todayKey);
  const room = stay.room ? model.rooms.find((entry) => entry.id === stay.room!.id) : undefined;
  const chosen = model.readyRooms.find((entry) => entry.id === choice);

  const footer =
    action === "assignRoom" ? (
      <Button className="h-12 w-full rounded-xl text-[15px] font-semibold" disabled={!chosen} onClick={() => { model.assignRoom(stay.id, chosen!); close(); }}>
        {chosen ? `Check in to room ${chosen.number}` : "Choose a room"}
      </Button>
    ) : action === "checkOut" ? (
      <Button className="h-12 w-full rounded-xl text-[15px] font-semibold" onClick={() => { model.checkOut(stay.id); close(); }}>
        Check out {stay.guestName.split(" ")[0]}
      </Button>
    ) : undefined;

  return (
    <BottomSheet open={open} onOpenChange={(next) => !next && close()} title={stay.guestName} description={`${partyLabel(stay)} · ${status.label}`} footer={footer}>
      <div className="grid gap-5">
        <div className="flex items-center gap-3">
          <InitialsAvatar name={stay.guestName} size="lg" />
          <dl className="grid flex-1 grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-subtle-foreground">Room</dt>
              <dd className="mt-0.5 font-medium">{room ? `${room.number} · ${room.roomType}` : "Not assigned"}</dd>
            </div>
            <div>
              <dt className="text-xs text-subtle-foreground">{stay.operationalStatus === "PENDING_CHECK_IN" ? "Shared ID at" : "Due out"}</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                {stay.operationalStatus === "PENDING_CHECK_IN" ? formatTime(stay.submittedAt) : formatDay(stay.expectedCheckOutDate, model.todayKey)}
              </dd>
            </div>
          </dl>
        </div>
        {action === "assignRoom" ? (
          <section className="grid gap-3">
            <h3 className="text-[15px] font-semibold">Choose a ready room</h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {model.readyRooms.map((entry) => {
                const selected = entry.id === choice;
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => setChoice(entry.id)}
                      aria-pressed={selected}
                      className={cn(
                        "press relative block w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected && "ring-2 ring-foreground ring-offset-2",
                      )}
                    >
                      <RoomPhoto room={entry} className="aspect-[4/3] w-full rounded-xl" />
                      {selected ? (
                        <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-foreground text-background">
                          <Check className="size-3.5" />
                        </span>
                      ) : null}
                      <span className="mt-2 block text-sm font-semibold">Room {entry.number}</span>
                      <span className="block truncate text-xs text-muted-foreground tabular-nums">
                        {entry.roomType} · {entry.nightlyRateMinor !== null ? formatMoneyWholeRupees(entry.nightlyRateMinor) : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
        <p className="text-xs text-subtle-foreground">ID access ends at checkout.</p>
      </div>
    </BottomSheet>
  );
}

function RoomSheet({ model }: { model: Model }) {
  const room = useLastDefined(model.rooms.find((entry) => entry.id === model.roomId));
  const close = () => model.setRoomId(null);
  if (!room) return null;
  const footer =
    room.status === "CLEANING" || room.status === "MAINTENANCE" ? (
      <Button className="h-12 w-full rounded-xl text-[15px] font-semibold" onClick={() => { model.markReady(room.id); close(); }}>
        Mark room {room.number} ready
      </Button>
    ) : undefined;
  return (
    <BottomSheet
      open={model.roomId !== null}
      onOpenChange={(next) => !next && close()}
      title={`Room ${room.number}`}
      description={`${room.roomType} · Floor ${room.floor}`}
      footer={footer}
    >
      <div className="grid gap-4">
        <RoomPhoto room={room} className="aspect-[16/9] w-full rounded-xl" />
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-subtle-foreground">Status</dt>
            <dd className="mt-0.5 font-medium">{{ VACANT: "Ready", OCCUPIED: "Occupied", CLEANING: "Cleaning", MAINTENANCE: "Maintenance" }[room.status]}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle-foreground">Nightly rate</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{room.nightlyRateMinor !== null ? formatMoneyWholeRupees(room.nightlyRateMinor) : "—"}</dd>
          </div>
        </dl>
      </div>
    </BottomSheet>
  );
}
