// Variant 2 — "Rooms": Airbnb Listings-style board. Photo-forward room tiles
// grouped by floor, status pill filters, act on a room from its sheet.
import type { HotelRoom } from "@tattvix/contracts";
import { cn } from "@tattvix/ui/lib/utils";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { formatMoneyWholeRupees } from "@/lib/money";

import { BottomSheet } from "./bottom-sheet";
import { Avatar, Frame, LargeTitle, PillTabs } from "./chrome";
import { roomTypePhoto } from "./data";
import { formatDayInline, formatTime, partyLabel, RoomSheet, StaySheet } from "./sheets";
import { statusDot, statusLabel, useMockHotel, type MockHotelState } from "./use-mock-hotel";

type Filter = "all" | "VACANT" | "OCCUPIED" | "leaving" | "CLEANING" | "MAINTENANCE";

const floors = ["Ground", "First", "Second"];

export function RoomsVariant() {
  const hotel = useMockHotel();
  const [filter, setFilter] = useState<Filter>("all");
  const [roomId, setRoomId] = useState<number | null>(null);
  const [stayId, setStayId] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);

  const active = hotel.rooms.filter((room) => room.isActive);
  const leavingRoomIds = new Set(hotel.leaving.map((stay) => stay.room?.id));
  const matches = (room: HotelRoom) =>
    filter === "all" ? true : filter === "leaving" ? leavingRoomIds.has(room.id) : room.status === filter;
  const count = (value: Filter) => active.filter((room) => (value === "all" ? true : value === "leaving" ? leavingRoomIds.has(room.id) : room.status === value)).length;
  const shown = active.filter(matches);

  return (
    <Frame>
      <LargeTitle
        title="Rooms today"
        meta={`${hotel.stats.occupied} of ${hotel.stats.active} occupied · ${hotel.stats.vacant} ready to sell`}
      />

      {hotel.waiting.length ? (
        <button
          type="button"
          onClick={() => setQueueOpen(true)}
          className="pd-press mt-6 flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-[var(--pd-shadow-card)] hover:shadow-[var(--pd-shadow-raised)] md:mt-8 md:p-5"
        >
          <span className="flex -space-x-2">
            {hotel.waiting.slice(0, 3).map((stay) => (
              <Avatar key={stay.id} name={stay.guestName} className="ring-[3px] ring-background" />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">
              {hotel.waiting.length} {hotel.waiting.length === 1 ? "guest is" : "guests are"} waiting for a room
            </span>
            <span className="block truncate text-sm text-muted-foreground">
              Longest wait since {formatTime(hotel.waiting[0]!.submittedAt)} · {hotel.vacantRooms.length} rooms ready
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </button>
      ) : null}

      <StatusMeter hotel={hotel} />

      <div className="sticky top-12 z-10 -mx-4 mt-6 bg-background/95 px-4 py-3 backdrop-blur md:top-20 md:-mx-6 md:px-6 lg:-mx-10 lg:px-10">
        <PillTabs
          label="Room status"
          value={filter}
          onChange={setFilter}
          items={[
            { value: "all", label: "All rooms", count: count("all") },
            { value: "VACANT", label: "Ready", count: count("VACANT") },
            { value: "leaving", label: "Checking out", count: count("leaving") },
            { value: "OCCUPIED", label: "Occupied", count: count("OCCUPIED") },
            { value: "CLEANING", label: "Cleaning", count: count("CLEANING") },
            { value: "MAINTENANCE", label: "Maintenance", count: count("MAINTENANCE") },
          ]}
        />
      </div>

      <div key={filter} className="grid gap-10 pt-3">
        {floors.map((floor) => {
          const rooms = shown.filter((room) => room.floor === floor);
          if (!rooms.length) return null;
          return (
            <section key={floor}>
              <h2 className="mb-4 text-lg font-semibold tracking-tight">
                {floor} floor <span className="font-normal text-muted-foreground">· {rooms.length}</span>
              </h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
                {rooms.map((room, index) => (
                  <RoomTile key={room.id} room={room} hotel={hotel} index={index} onOpen={() => setRoomId(room.id)} />
                ))}
              </div>
            </section>
          );
        })}
        {!shown.length ? (
          <p className="rounded-2xl bg-muted/60 px-6 py-12 text-center text-[15px] font-medium">No rooms match this filter.</p>
        ) : null}
      </div>

      <BottomSheet open={queueOpen} onClose={() => setQueueOpen(false)} title="Waiting for a room">
        <ul className="-my-2 divide-y divide-border-soft">
          {hotel.waiting.map((stay) => (
            <li key={stay.id}>
              <button
                type="button"
                onClick={() => {
                  setQueueOpen(false);
                  setStayId(stay.id);
                }}
                className="pd-press flex min-h-16 w-full items-center gap-3 py-2 text-left"
              >
                <Avatar name={stay.guestName} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{stay.guestName}</span>
                  <span className="block text-sm text-muted-foreground">
                    {partyLabel(stay)} · since {formatTime(stay.submittedAt)}
                  </span>
                </span>
                <span className="text-sm font-semibold text-primary">Assign</span>
              </button>
            </li>
          ))}
          {!hotel.waiting.length ? <li className="py-6 text-center text-sm text-muted-foreground">Everyone has a room.</li> : null}
        </ul>
      </BottomSheet>
      <RoomSheet
        hotel={hotel}
        roomId={roomId}
        onClose={() => setRoomId(null)}
        onOpenStay={(id) => {
          setRoomId(null);
          setStayId(id);
        }}
      />
      <StaySheet hotel={hotel} stayId={stayId} onClose={() => setStayId(null)} />
    </Frame>
  );
}

function StatusMeter({ hotel }: { hotel: MockHotelState }) {
  const { stats } = hotel;
  const parts = [
    { key: "OCCUPIED" as const, value: stats.occupied },
    { key: "VACANT" as const, value: stats.vacant },
    { key: "CLEANING" as const, value: stats.cleaning },
    { key: "MAINTENANCE" as const, value: stats.maintenance },
  ];
  return (
    <div className="mt-6 md:mt-8">
      <div className="flex h-2.5 gap-1" aria-hidden>
        {parts.map((part) =>
          part.value ? (
            <span
              key={part.key}
              className={cn("rounded-full transition-[flex-grow] duration-300 ease-out", statusDot[part.key], part.key === "OCCUPIED" && "bg-primary", part.key === "VACANT" && "bg-primary/35")}
              style={{ flexGrow: part.value }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        {parts.map((part) => (
          <li key={part.key} className="flex items-center gap-2">
            <span
              className={cn("size-2 rounded-full", statusDot[part.key], part.key === "OCCUPIED" && "bg-primary", part.key === "VACANT" && "bg-primary/35")}
              aria-hidden
            />
            {statusLabel[part.key]} <span className="font-semibold text-foreground tabular-nums">{part.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoomTile({
  room,
  hotel,
  index,
  onOpen,
}: {
  room: HotelRoom;
  hotel: MockHotelState;
  index: number;
  onOpen: () => void;
}) {
  const photo = roomTypePhoto(room.roomType);
  const stay = hotel.stayByRoomId.get(room.id);
  const leaving = stay?.expectedCheckOutDate && stay.expectedCheckOutDate <= hotel.todayKey;
  const overdue = stay?.expectedCheckOutDate && stay.expectedCheckOutDate < hotel.todayKey;
  const badge = overdue
    ? "Overdue"
    : leaving
      ? "Checking out"
      : room.status === "VACANT"
        ? "Ready"
        : room.status === "OCCUPIED"
          ? null
          : statusLabel[room.status];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="pd-press pd-enter group min-w-0 text-left"
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="relative overflow-hidden rounded-xl bg-muted">
        {photo ? (
          <img
            src={photo}
            alt=""
            loading="lazy"
            className={cn(
              "aspect-[4/3] w-full object-cover transition-[filter] duration-200",
              (room.status === "MAINTENANCE" || room.status === "CLEANING") && "grayscale-[60%]",
            )}
          />
        ) : (
          <div className="aspect-[4/3]" />
        )}
        {badge ? (
          <span
            className={cn(
              "absolute top-2.5 left-2.5 rounded-full bg-background/95 px-2.5 py-1 text-xs font-semibold shadow-sm",
              overdue || room.status === "MAINTENANCE" ? "text-destructive" : leaving || room.status === "CLEANING" ? "text-warning" : "text-primary",
            )}
          >
            {badge}
          </span>
        ) : null}
        <span className="absolute right-2.5 bottom-2.5 rounded-lg bg-background/95 px-2 py-0.5 text-sm font-bold tabular-nums shadow-sm">
          {room.number}
        </span>
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <p className="truncate text-[15px] font-semibold">{room.roomType}</p>
      </div>
      <p className="truncate text-sm text-muted-foreground">
        {stay
          ? `${stay.guestName} · out ${formatDayInline(stay.expectedCheckOutDate, hotel.todayKey)}`
          : room.status === "VACANT"
            ? "Free tonight"
            : room.status === "CLEANING"
              ? "Being cleaned"
              : "Out of service"}
      </p>
      {room.nightlyRateMinor ? (
        <p className="mt-0.5 text-sm tabular-nums">
          <span className="font-semibold">{formatMoneyWholeRupees(room.nightlyRateMinor)}</span>{" "}
          <span className="text-muted-foreground">night</span>
        </p>
      ) : null}
    </button>
  );
}
