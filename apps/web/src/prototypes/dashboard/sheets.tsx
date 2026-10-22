// Detail sheets shared by the variants: a reservation (stay) sheet and a room
// sheet. Each exposes only actions the product really has: assign a room +
// nights (check in), check out, and set a room's housekeeping status.
import type { HotelRoom, HotelStayListItem } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { cn } from "@tattvix/ui/lib/utils";
import { Minus, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { localDayKey } from "@/features/hotel-overview/metrics";
import { formatMoneyWholeRupees } from "@/lib/money";

import { BottomSheet } from "./bottom-sheet";
import { Avatar } from "./chrome";
import { roomTypePhoto } from "./data";
import { statusDot, statusLabel, statusText, type MockHotelState } from "./use-mock-hotel";

const dateFormat = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });
const timeFormat = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

export function formatDay(key: string | null, todayKey: string) {
  if (!key) return "—";
  if (key === todayKey) return "Today";
  return dateFormat.format(new Date(`${key}T12:00:00`));
}

/** Same as formatDay, but reads naturally mid-sentence ("due out today"). */
export function formatDayInline(key: string | null, todayKey: string) {
  return key === todayKey ? "today" : formatDay(key, todayKey);
}

export function formatTime(iso: string | null) {
  return iso ? timeFormat.format(new Date(iso)) : "—";
}

export function partyLabel(stay: HotelStayListItem) {
  const people = stay.companionCount + 1;
  return `${people} ${people === 1 ? "guest" : "guests"}`;
}

export function nightsBetween(fromIso: string | null, toKey: string | null) {
  if (!fromIso || !toKey) return null;
  const from = new Date(fromIso);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(`${toKey}T00:00:00`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

/** Plain-language status line in colour, Airbnb style. */
export function stayStatusLine(stay: HotelStayListItem, todayKey: string) {
  if (stay.operationalStatus === "PENDING_CHECK_IN") {
    return { text: `Waiting since ${formatTime(stay.submittedAt)}`, className: "text-warning" };
  }
  if (stay.operationalStatus === "CHECKED_OUT") {
    return { text: `Checked out ${formatTime(stay.checkedOutAt)}`, className: "text-muted-foreground" };
  }
  if (stay.expectedCheckOutDate && stay.expectedCheckOutDate < todayKey) {
    return { text: "Overdue checkout", className: "text-destructive" };
  }
  if (stay.expectedCheckOutDate === todayKey) {
    return { text: "Checking out today", className: "text-warning" };
  }
  return { text: "Currently hosting", className: "text-primary" };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-subtle-foreground">{label}</p>
      <p className="mt-0.5 truncate text-[15px] font-medium tabular-nums">{children}</p>
    </div>
  );
}

function RoomChoice({
  room,
  selected,
  onSelect,
}: {
  room: HotelRoom;
  selected: boolean;
  onSelect: () => void;
}) {
  const photo = roomTypePhoto(room.roomType);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "pd-press flex w-full items-center gap-3 rounded-2xl border p-2 pr-3 text-left",
        selected ? "border-foreground shadow-[inset_0_0_0_1px_var(--foreground)]" : "border-border hover:border-foreground/40",
      )}
    >
      {photo ? <img src={photo.replace("w=1200&h=800", "w=160&h=160")} alt="" className="size-14 shrink-0 rounded-xl object-cover" /> : null}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[15px] font-semibold tabular-nums">Room {room.number}</span>
          {room.nightlyRateMinor ? (
            <span className="shrink-0 text-sm font-semibold tabular-nums">{formatMoneyWholeRupees(room.nightlyRateMinor)}</span>
          ) : null}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {room.roomType} · {room.floor} floor
        </span>
      </span>
    </button>
  );
}

function NightsStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[15px] font-semibold">Nights</p>
        <p className="text-sm text-muted-foreground">Sets the expected checkout</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Fewer nights"
          disabled={value <= 1}
          onClick={() => onChange(value - 1)}
          className="pd-press grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:border-foreground disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-6 text-center text-base font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          aria-label="More nights"
          onClick={() => onChange(Math.min(30, value + 1))}
          className="pd-press grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:border-foreground"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function StaySheet({
  hotel,
  stayId,
  onClose,
}: {
  hotel: MockHotelState;
  stayId: string | null;
  onClose: () => void;
}) {
  // Keep the last stay while the sheet animates out.
  const [lastId, setLastId] = useState(stayId);
  useEffect(() => {
    if (stayId) setLastId(stayId);
  }, [stayId]);
  const stay = hotel.stays.find((entry) => entry.id === (stayId ?? lastId));
  const [roomId, setRoomId] = useState<number | null>(null);
  const [nights, setNights] = useState(2);
  useEffect(() => {
    setRoomId(null);
    setNights(2);
  }, [stayId]);

  const room = stay?.room ? hotel.roomsById.get(stay.room.id) : undefined;
  const photo = roomTypePhoto(room?.roomType);
  const waiting = stay?.operationalStatus === "PENDING_CHECK_IN";
  const inHouse = stay?.operationalStatus === "CHECKED_IN";
  const status = stay ? stayStatusLine(stay, hotel.todayKey) : null;
  const nightsStayed = stay ? nightsBetween(stay.checkedInAt, stay.expectedCheckOutDate) : null;

  const footer = stay ? (
    waiting ? (
      <Button
        className="pd-press h-12 w-full rounded-xl text-[15px] font-semibold"
        disabled={roomId === null}
        onClick={() => {
          if (roomId === null) return;
          hotel.assignRoom(stay.id, roomId, nights);
          onClose();
        }}
      >
        {roomId === null ? "Choose a room" : `Check in to room ${hotel.roomsById.get(roomId)?.number}`}
      </Button>
    ) : inHouse ? (
      <Button
        className="pd-press h-12 w-full rounded-xl text-[15px] font-semibold"
        onClick={() => {
          hotel.checkOut(stay.id);
          onClose();
        }}
      >
        Check out
      </Button>
    ) : null
  ) : null;

  return (
    <BottomSheet open={stayId !== null} onClose={onClose} title={waiting ? "Assign a room" : "Reservation"} footer={footer}>
      {stay ? (
        <div className="grid gap-6">
          {photo && !waiting ? (
            <img src={photo} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover" />
          ) : null}
          <div className="flex items-center gap-4">
            <Avatar name={stay.guestName} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold tracking-tight">{stay.guestName}</p>
              <p className="text-sm text-muted-foreground">
                {partyLabel(stay)}
                {room ? ` · Room ${room.number}, ${room.roomType}` : ""}
              </p>
              {status ? <p className={cn("mt-0.5 text-sm font-medium", status.className)}>{status.text}</p> : null}
            </div>
          </div>

          {waiting ? (
            <>
              <NightsStepper value={nights} onChange={setNights} />
              <div className="grid gap-2.5">
                <p className="text-[15px] font-semibold">
                  Ready rooms <span className="font-normal text-muted-foreground">({hotel.vacantRooms.length})</span>
                </p>
                {hotel.vacantRooms.length ? (
                  hotel.vacantRooms.map((choice) => (
                    <RoomChoice key={choice.id} room={choice} selected={roomId === choice.id} onSelect={() => setRoomId(choice.id)} />
                  ))
                ) : (
                  <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                    No rooms are ready. Mark a cleaned room as ready first.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border-soft py-5">
              <Fact label="Check-in">{stay.checkedInAt ? `${formatDay(localDayKey(new Date(stay.checkedInAt)), hotel.todayKey)}, ${formatTime(stay.checkedInAt)}` : "—"}</Fact>
              <Fact label={stay.checkedOutAt ? "Checked out" : "Checkout"}>
                {stay.checkedOutAt ? formatTime(stay.checkedOutAt) : `${formatDay(stay.expectedCheckOutDate, hotel.todayKey)}, by 11:00`}
              </Fact>
              <Fact label="Nights">{nightsStayed ?? "—"}</Fact>
              <Fact label="Nightly rate">{room?.nightlyRateMinor ? formatMoneyWholeRupees(room.nightlyRateMinor) : "—"}</Fact>
            </div>
          )}

          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            {stay.identityAccess.isActive
              ? `ID shared at check-in · access ends ${dateFormat.format(new Date(stay.identityAccess.expiresAt!))}`
              : "ID access has ended"}
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}

export function RoomSheet({
  hotel,
  roomId,
  onClose,
  onOpenStay,
}: {
  hotel: MockHotelState;
  roomId: number | null;
  onClose: () => void;
  onOpenStay: (stayId: string) => void;
}) {
  const [lastId, setLastId] = useState(roomId);
  useEffect(() => {
    if (roomId !== null) setLastId(roomId);
  }, [roomId]);
  const room = hotel.roomsById.get(roomId ?? lastId ?? -1);
  const stay = room ? hotel.stayByRoomId.get(room.id) : undefined;
  const photo = roomTypePhoto(room?.roomType);

  const actions: { label: string; status: "VACANT" | "CLEANING" | "MAINTENANCE" }[] =
    room?.status === "CLEANING"
      ? [{ label: "Mark ready", status: "VACANT" }, { label: "Needs maintenance", status: "MAINTENANCE" }]
      : room?.status === "MAINTENANCE"
        ? [{ label: "Back in service", status: "VACANT" }]
        : room?.status === "VACANT"
          ? [{ label: "Send to cleaning", status: "CLEANING" }, { label: "Needs maintenance", status: "MAINTENANCE" }]
          : [];

  const footer = room ? (
    stay ? (
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="pd-press h-12 rounded-xl text-[15px] font-semibold" onClick={() => onOpenStay(stay.id)}>
          Reservation
        </Button>
        <Button
          className="pd-press h-12 rounded-xl text-[15px] font-semibold"
          onClick={() => {
            hotel.checkOut(stay.id);
            onClose();
          }}
        >
          Check out
        </Button>
      </div>
    ) : actions.length ? (
      <div className={cn("grid gap-2", actions.length > 1 && "grid-cols-2")}>
        {actions.map((action, index) => (
          <Button
            key={action.label}
            variant={index === 0 ? "default" : "outline"}
            className="pd-press h-12 rounded-xl text-[15px] font-semibold"
            onClick={() => {
              hotel.setRoomStatus(room.id, action.status);
              onClose();
            }}
          >
            {action.label}
          </Button>
        ))}
      </div>
    ) : null
  ) : null;

  return (
    <BottomSheet open={roomId !== null} onClose={onClose} title={room ? `Room ${room.number}` : "Room"} footer={footer}>
      {room ? (
        <div className="grid gap-5">
          {photo ? <img src={photo} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover" /> : null}
          <div>
            <p className="text-xl font-semibold tracking-tight">{room.roomType}</p>
            <p className="text-sm text-muted-foreground">
              {room.floor} floor{room.nightlyRateMinor ? ` · ${formatMoneyWholeRupees(room.nightlyRateMinor)} a night` : ""}
            </p>
            <p className={cn("mt-1 flex items-center gap-2 text-sm font-medium", statusText[room.status])}>
              <span className={cn("size-2 rounded-full", statusDot[room.status])} aria-hidden />
              {statusLabel[room.status]}
            </p>
          </div>
          {stay ? (
            <div className="flex items-center gap-3 border-t border-border-soft pt-5">
              <Avatar name={stay.guestName} />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{stay.guestName}</p>
                <p className="text-sm text-muted-foreground">
                  {partyLabel(stay)} · due out {formatDayInline(stay.expectedCheckOutDate, hotel.todayKey)}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </BottomSheet>
  );
}
