// Variant 1 — "Today": Airbnb host Today tab. Reservation-state pill tabs
// with counts over a grid of guest cards; detail and actions in a sheet.
import type { HotelStayListItem } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { cn } from "@tattvix/ui/lib/utils";
import { BedDouble, Sparkles } from "lucide-react";
import { useState } from "react";

import { formatMoneyWholeRupees } from "@/lib/money";

import { Avatar, Frame, LargeTitle, PillTabs, SectionTitle } from "./chrome";
import { property, roomTypePhoto } from "./data";
import { formatDayInline, formatTime, partyLabel, RoomSheet, StaySheet, stayStatusLine } from "./sheets";
import { useMockHotel, type MockHotelState } from "./use-mock-hotel";

type Tab = "out" | "hosting" | "arriving" | "done";

const longDate = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });

export function TodayVariant() {
  const hotel = useMockHotel();
  const [tab, setTab] = useState<Tab>("out");
  const [stayId, setStayId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);

  const lists: Record<Tab, HotelStayListItem[]> = {
    out: hotel.leaving,
    hosting: hotel.inHouse,
    arriving: hotel.waiting,
    done: hotel.checkedOutToday,
  };
  const empty: Record<Tab, string> = {
    out: "No one is checking out today.",
    hosting: "No guests are staying right now.",
    arriving: "No one is waiting for a room.",
    done: "No checkouts yet today.",
  };
  const shown = lists[tab];

  return (
    <Frame>
      <LargeTitle
        title={`Welcome back, ${property.staffName}`}
        meta={`${longDate.format(new Date())} · ${property.name}`}
      />

      <section className="mt-8 md:mt-12">
        <SectionTitle
          title="Your reservations"
          meta={`${hotel.waiting.length} waiting for a room · ${hotel.leaving.length} checking out`}
          className="mb-4"
        />
        <PillTabs
          label="Reservation status"
          value={tab}
          onChange={setTab}
          items={[
            { value: "out", label: "Checking out", count: hotel.leaving.length },
            { value: "hosting", label: "Currently hosting", count: hotel.inHouse.length },
            { value: "arriving", label: "Arriving soon", count: hotel.waiting.length },
            { value: "done", label: "Checked out", count: hotel.checkedOutToday.length },
          ]}
        />

        {shown.length ? (
          <div
            key={tab}
            className="pd-rail mt-5 auto-cols-[84%] sm:auto-cols-[46%] md:grid-flow-row md:grid-cols-2 md:overflow-visible lg:grid-cols-3 xl:grid-cols-4"
          >
            {shown.map((stay, index) => (
              <ReservationCard key={stay.id} stay={stay} hotel={hotel} index={index} onOpen={() => setStayId(stay.id)} />
            ))}
          </div>
        ) : (
          <div className="mt-5 grid place-items-center rounded-2xl bg-muted/60 px-6 py-12 text-center">
            <Sparkles className="size-6 text-subtle-foreground" />
            <p className="mt-3 text-[15px] font-medium">{empty[tab]}</p>
          </div>
        )}
      </section>

      <section className="mt-12">
        <SectionTitle
          title="Ready to check in"
          meta={`${hotel.vacantRooms.length} rooms cleaned and free tonight`}
          className="mb-4"
        />
        <div className="pd-rail auto-cols-[62%] sm:auto-cols-[38%] md:auto-cols-[30%] lg:auto-cols-[calc((100%-48px)/5)]">
          {hotel.vacantRooms.map((room, index) => {
            const photo = roomTypePhoto(room.roomType);
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => setRoomId(room.id)}
                className="pd-press pd-enter group text-left"
                style={{ "--i": index } as React.CSSProperties}
              >
                <div className="overflow-hidden rounded-xl bg-muted">
                  {photo ? (
                    <img src={photo} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="grid aspect-square place-items-center">
                      <BedDouble className="size-6 text-subtle-foreground" />
                    </div>
                  )}
                </div>
                <p className="mt-2.5 text-[15px] font-semibold tabular-nums">Room {room.number}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {room.roomType} · {room.floor} floor
                </p>
                {room.nightlyRateMinor ? (
                  <p className="mt-0.5 text-sm tabular-nums">
                    <span className="font-semibold">{formatMoneyWholeRupees(room.nightlyRateMinor)}</span>{" "}
                    <span className="text-muted-foreground">night</span>
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border p-5 md:p-6">
          <h2 className="text-lg font-semibold tracking-tight">Housekeeping</h2>
          <p className="text-sm text-muted-foreground">
            {hotel.toClean.length ? `${hotel.toClean.length} rooms to clean before new arrivals` : "Every room is clean"}
          </p>
          <ul className="mt-3 divide-y divide-border-soft">
            {hotel.toClean.map((room) => (
              <li key={room.id} className="flex min-h-14 items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-warning-tint text-sm font-semibold text-warning tabular-nums">
                  {room.number}
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px]">{room.roomType}</span>
                <Button
                  variant="outline"
                  className="pd-press h-9 rounded-full px-4 text-sm"
                  onClick={() => hotel.setRoomStatus(room.id, "VACANT")}
                >
                  Mark ready
                </Button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border p-5 md:p-6">
          <h2 className="text-lg font-semibold tracking-tight">Tonight</h2>
          <p className="text-sm text-muted-foreground">
            {hotel.stats.occupied} of {hotel.stats.active} rooms occupied
          </p>
          <div className="mt-5 flex items-end gap-2">
            <span className="text-[44px] leading-none font-bold tracking-tight tabular-nums">{hotel.stats.occupancyPercent}%</span>
            <span className="pb-1.5 text-sm text-muted-foreground">occupancy</span>
          </div>
          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className="bg-primary" style={{ width: `${(hotel.stats.occupied / hotel.stats.active) * 100}%` }} />
            <span className="bg-warning/70" style={{ width: `${(hotel.stats.cleaning / hotel.stats.active) * 100}%` }} />
            <span className="bg-destructive/70" style={{ width: `${(hotel.stats.maintenance / hotel.stats.active) * 100}%` }} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground tabular-nums">
            {hotel.stats.vacant} ready · {hotel.stats.cleaning} cleaning · {hotel.stats.maintenance} maintenance
          </p>
        </div>
      </section>

      <StaySheet hotel={hotel} stayId={stayId} onClose={() => setStayId(null)} />
      <RoomSheet
        hotel={hotel}
        roomId={roomId}
        onClose={() => setRoomId(null)}
        onOpenStay={(id) => {
          setRoomId(null);
          setStayId(id);
        }}
      />
    </Frame>
  );
}

function ReservationCard({
  stay,
  hotel,
  index,
  onOpen,
}: {
  stay: HotelStayListItem;
  hotel: MockHotelState;
  index: number;
  onOpen: () => void;
}) {
  const status = stayStatusLine(stay, hotel.todayKey);
  const room = stay.room ? hotel.roomsById.get(stay.room.id) : undefined;
  const waiting = stay.operationalStatus === "PENDING_CHECK_IN";
  const inHouse = stay.operationalStatus === "CHECKED_IN";
  const actionLabel = waiting ? "Assign room" : inHouse ? (stay.expectedCheckOutDate! <= hotel.todayKey ? "Check out" : "Details") : "Details";

  return (
    <article
      className="pd-enter flex min-w-0 flex-col rounded-2xl border border-border bg-card shadow-[var(--pd-shadow-card)]"
      style={{ "--i": index } as React.CSSProperties}
    >
      <button type="button" onClick={onOpen} className="pd-press flex flex-1 flex-col rounded-t-2xl p-5 text-left">
        <div className="flex items-start justify-between gap-3">
          <p className={cn("pt-1 text-sm font-semibold", status.className)}>{status.text}</p>
          <Avatar name={stay.guestName} />
        </div>
        <p className="mt-1 truncate text-lg font-semibold tracking-tight">{stay.guestName}</p>
        <p className="truncate text-sm text-muted-foreground">
          {room ? `Room ${room.number} · ${room.roomType}` : `${partyLabel(stay)} · checked in on their phone`}
        </p>
        <p className="mt-3 text-sm text-muted-foreground tabular-nums">
          {waiting
            ? `Submitted ${formatTime(stay.submittedAt)}`
            : stay.checkedOutAt
              ? `Left ${formatTime(stay.checkedOutAt)} · ${partyLabel(stay)}`
              : `${partyLabel(stay)} · due out ${formatDayInline(stay.expectedCheckOutDate, hotel.todayKey)}`}
        </p>
      </button>
      <div className="border-t border-border-soft p-3">
        <Button
          variant={actionLabel === "Details" ? "ghost" : "outline"}
          className="pd-press h-11 w-full rounded-xl text-[15px] font-semibold"
          onClick={() => {
            if (actionLabel === "Check out") hotel.checkOut(stay.id);
            else onOpen();
          }}
        >
          {actionLabel}
        </Button>
      </div>
    </article>
  );
}
