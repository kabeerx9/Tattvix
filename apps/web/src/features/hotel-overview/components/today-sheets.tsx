// Reservation and room sheets for the Today page. Bottom sheets on phones,
// dialogs from 768px. Every action is a real mutation and is only offered to
// roles that may perform it; the server still enforces permissions.
import type { HotelRoom, HotelStayListItem, PropertyPhotosResponse } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
import { cn } from "@tattvix/ui/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BedDouble, Minus, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { InitialsAvatar } from "@/components/design-system";
import { hotelOperationsMutations } from "@/features/hotel-operations/mutations";
import { getRoomTypePhotoUrl } from "@/features/property-photos/helpers";
import { useHotelSubscription } from "@/features/subscription/use-hotel-subscription";
import { ApiError } from "@/lib/api";
import { formatMoneyMinor, formatMoneyWholeRupees } from "@/lib/money";

import { getReadyRooms, getStayStatus, localDayKey, type StayStatusTone } from "../metrics";

export type TodayScope = {
  organizationSlug: string;
  propertySlug: string;
  canAssign: boolean;
  canCheckout: boolean;
  canManageRooms: boolean;
};

const dayFormat = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });

export const statusToneClassName: Record<StayStatusTone, string> = {
  warning: "text-warning",
  danger: "text-destructive",
  primary: "text-muted-foreground",
  muted: "text-muted-foreground",
};

import { formatDay, formatTime, partyLabel } from "@tattvix/api";
export { formatDay, formatTime, partyLabel };

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : error ? fallback : null;
}

/** Room photo from the property's uploads, or a calm neutral tile. */
export function RoomPhoto({
  url,
  className,
  iconClassName,
}: {
  url?: string;
  className?: string;
  iconClassName?: string;
}) {
  return url ? (
    <img src={url} alt="" loading="lazy" decoding="async" className={cn("bg-muted object-cover", className)} />
  ) : (
    <div aria-hidden className={cn("grid place-items-center bg-muted text-subtle-foreground", className)}>
      <BedDouble className={cn("size-7", iconClassName)} strokeWidth={1.5} />
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-subtle-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-[15px] font-medium tabular-nums">{children}</dd>
    </div>
  );
}

function NightsStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
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
          className="press grid size-10 place-items-center rounded-full border border-border text-muted-foreground outline-none hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <output className="w-8 text-center text-base font-semibold tabular-nums" aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          aria-label="More nights"
          disabled={value >= 365}
          onClick={() => onChange(value + 1)}
          className="press grid size-10 place-items-center rounded-full border border-border text-muted-foreground outline-none hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Keeps the last non-null value so a sheet can animate out with its content. */
function useLatest<T>(value: T | null): T | null {
  const [latest, setLatest] = useState(value);
  useEffect(() => {
    if (value !== null) setLatest(value);
  }, [value]);
  return value ?? latest;
}

export function StaySheet({
  scope,
  stayId,
  stays,
  rooms,
  photos,
  onClose,
}: {
  scope: TodayScope;
  stayId: string | null;
  stays: HotelStayListItem[];
  rooms: HotelRoom[];
  photos?: PropertyPhotosResponse;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const checkIn = useMutation(hotelOperationsMutations.checkIn(queryClient));
  const checkout = useMutation(hotelOperationsMutations.checkout(queryClient));
  // A lapsed trial pauses check-ins (checkout stays open); the server returns 402 regardless.
  const entitled = useHotelSubscription(scope.organizationSlug)?.entitled ?? true;
  const shownId = useLatest(stayId);
  const stay = stays.find((entry) => entry.id === shownId);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [nights, setNights] = useState(1);

  useEffect(() => {
    setRoomId(null);
    setNights(1);
    checkIn.reset();
    checkout.reset();
    // Reset per opened stay only.
  }, [stayId]);

  const todayKey = localDayKey(new Date());
  const roomsById = new Map(rooms.map((room) => [room.id, room]));
  const room = stay?.room ? roomsById.get(stay.room.id) : undefined;
  const readyRooms = getReadyRooms(rooms);
  const selected = roomId !== null ? roomsById.get(roomId) : undefined;
  const waiting = stay?.operationalStatus === "PENDING_CHECK_IN";
  const inHouse = stay?.operationalStatus === "CHECKED_IN";
  const status = stay ? getStayStatus(stay, todayKey) : null;
  const params = { organizationSlug: scope.organizationSlug, propertySlug: scope.propertySlug };
  const error =
    errorMessage(checkIn.error, "The guest could not be checked in.") ??
    errorMessage(checkout.error, "The guest could not be checked out.");

  function confirmCheckIn() {
    if (!stay || !selected) return;
    checkIn.mutate(
      { ...params, stayId: stay.id, roomId: selected.id, nights },
      {
        onSuccess: () => {
          toast.success(`${stay.guestName} checked in to room ${selected.number}`);
          onClose();
        },
      },
    );
  }

  function confirmCheckout() {
    if (!stay) return;
    checkout.mutate(
      { ...params, stayId: stay.id },
      {
        onSuccess: () => {
          toast.success(`${stay.guestName} checked out${room ? `; room ${room.number} needs cleaning` : ""}`);
          onClose();
        },
      },
    );
  }

  const idActive = stay?.identityAccess.isActive ?? false;
  const selectedHasRate = selected?.nightlyRateMinor !== null && selected?.nightlyRateMinor !== undefined;
  let footer: React.ReactNode = null;
  if (stay && waiting && scope.canAssign) {
    footer = (
      <Button
        className="h-12 w-full rounded-xl text-[15px] font-semibold"
        disabled={!entitled || !selected || !selectedHasRate || !idActive || checkIn.isPending}
        onClick={confirmCheckIn}
      >
        {!entitled
          ? "Check-ins paused · trial ended"
          : checkIn.isPending
            ? "Checking in…"
            : selected
              ? `Check in to room ${selected.number}`
              : "Choose a room"}
      </Button>
    );
  } else if (stay && inHouse && scope.canCheckout) {
    footer = (
      <Button className="h-12 w-full rounded-xl text-[15px] font-semibold" disabled={checkout.isPending} onClick={confirmCheckout}>
        {checkout.isPending ? "Checking out…" : "Confirm check-out"}
      </Button>
    );
  }

  return (
    <BottomSheet
      open={stayId !== null}
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={waiting && scope.canAssign ? "Assign a room" : "Reservation"}
      footer={footer}
    >
      {stay ? (
        <div className="grid gap-6">
          {!waiting ? (
            <RoomPhoto url={getRoomTypePhotoUrl(photos, room?.roomType)} className="aspect-[16/9] w-full rounded-2xl" />
          ) : null}
          <div className="flex items-center gap-4">
            <InitialsAvatar name={stay.guestName} size="lg" />
            <div className="min-w-0">
              <p className="text-xl font-semibold tracking-tight wrap-anywhere">{stay.guestName}</p>
              <p className="text-sm text-muted-foreground">
                {partyLabel(stay)}
                {room ? ` · Room ${room.number}${room.roomType ? `, ${room.roomType}` : ""}` : ""}
              </p>
              {status ? <p className={cn("mt-0.5 text-sm font-medium", statusToneClassName[status.tone])}>{status.label}</p> : null}
            </div>
          </div>

          {waiting && scope.canAssign ? (
            <>
              <NightsStepper value={nights} onChange={setNights} />
              <div className="grid gap-2.5">
                <p className="text-[15px] font-semibold">
                  Ready rooms <span className="font-normal text-muted-foreground">({readyRooms.length})</span>
                </p>
                {readyRooms.length ? (
                  <ul className="grid gap-2" aria-label="Ready rooms">
                    {readyRooms.map((choice) => {
                      const isSelected = choice.id === roomId;
                      return (
                        <li key={choice.id}>
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => setRoomId(choice.id)}
                            className={cn(
                              "press flex w-full items-center gap-3 rounded-2xl border p-2 pr-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              isSelected
                                ? "border-foreground shadow-[inset_0_0_0_1px_var(--foreground)]"
                                : "border-border hover:border-foreground/40",
                            )}
                          >
                            <RoomPhoto
                              url={getRoomTypePhotoUrl(photos, choice.roomType)}
                              className="size-14 shrink-0 rounded-xl"
                              iconClassName="size-5"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="text-[15px] font-semibold tabular-nums">Room {choice.number}</span>
                                <span className="shrink-0 text-sm font-semibold tabular-nums">
                                  {choice.nightlyRateMinor !== null ? formatMoneyWholeRupees(choice.nightlyRateMinor) : "No rate"}
                                </span>
                              </span>
                              <span className="block truncate text-sm text-muted-foreground">
                                {[choice.roomType, choice.floor ? `Floor ${choice.floor}` : null].filter(Boolean).join(" · ") || "Room"}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                    No rooms are ready. Mark a cleaned room ready first.
                  </p>
                )}
                {selected && !selectedHasRate ? (
                  <p className="text-sm text-destructive">Set a nightly rate for room {selected.number} before check-in.</p>
                ) : null}
                {selected && selectedHasRate ? (
                  <p className="text-sm text-muted-foreground tabular-nums">
                    Room charge {formatMoneyMinor(selected.nightlyRateMinor! * nights)} for {nights} {nights === 1 ? "night" : "nights"}.
                  </p>
                ) : null}
                {!idActive ? (
                  <p className="text-sm text-destructive">This guest's ID access has ended, so they can't be checked in.</p>
                ) : null}
              </div>
            </>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border-soft py-5">
              <Fact label="Checked in">
                {stay.checkedInAt
                  ? `${formatDay(localDayKey(new Date(stay.checkedInAt)), todayKey)}, ${formatTime(stay.checkedInAt)}`
                  : `Submitted ${formatTime(stay.submittedAt)}`}
              </Fact>
              <Fact label={stay.checkedOutAt ? "Checked out" : "Due out"}>
                {stay.checkedOutAt ? formatTime(stay.checkedOutAt) : formatDay(stay.expectedCheckOutDate, todayKey)}
              </Fact>
              <Fact label="Room">{room ? `${room.number}${room.floor ? ` · Floor ${room.floor}` : ""}` : "Not assigned"}</Fact>
              <Fact label="Nightly rate">
                {room?.nightlyRateMinor !== null && room?.nightlyRateMinor !== undefined ? formatMoneyWholeRupees(room.nightlyRateMinor) : "—"}
              </Fact>
            </dl>
          )}

          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <span>
              {stay.identityAccess.isActive
                ? stay.identityAccess.expiresAt
                  ? `ID access ends ${dayFormat.format(new Date(stay.identityAccess.expiresAt))}`
                  : "ID shared"
                : "ID access has ended"}
            </span>
          </div>

          {error ? (
            <p role="alert" className="rounded-xl bg-destructive-tint px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Link
            to="/hotel/$organizationSlug/$propertySlug/stays/$stayId"
            params={{ ...params, stayId: stay.id }}
            className="w-fit text-sm font-semibold underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open full stay and bill
          </Link>
        </div>
      ) : null}
    </BottomSheet>
  );
}

const roomStatusLabel: Record<HotelRoom["status"], string> = {
  VACANT: "Ready",
  OCCUPIED: "Occupied",
  CLEANING: "Cleaning",
  MAINTENANCE: "Maintenance",
};

const roomStatusClassName: Record<HotelRoom["status"], string> = {
  VACANT: "text-foreground",
  OCCUPIED: "text-foreground",
  CLEANING: "text-warning",
  MAINTENANCE: "text-destructive",
};

export function RoomSheet({
  scope,
  roomId,
  rooms,
  photos,
  onClose,
}: {
  scope: TodayScope;
  roomId: number | null;
  rooms: HotelRoom[];
  photos?: PropertyPhotosResponse;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const updateStatus = useMutation(hotelOperationsMutations.updateRoomStatus(queryClient));
  const shownId = useLatest(roomId);
  const room = rooms.find((entry) => entry.id === shownId);

  useEffect(() => {
    updateStatus.reset();
  }, [roomId]);

  const actions: { label: string; status: "VACANT" | "CLEANING" | "MAINTENANCE" }[] =
    room?.status === "CLEANING"
      ? [{ label: "Mark ready", status: "VACANT" }, { label: "Needs maintenance", status: "MAINTENANCE" }]
      : room?.status === "MAINTENANCE"
        ? [{ label: "Back in service", status: "VACANT" }]
        : room?.status === "VACANT"
          ? [{ label: "Send to cleaning", status: "CLEANING" }, { label: "Needs maintenance", status: "MAINTENANCE" }]
          : [];

  function setStatus(status: "VACANT" | "CLEANING" | "MAINTENANCE") {
    if (!room) return;
    updateStatus.mutate(
      { organizationSlug: scope.organizationSlug, propertySlug: scope.propertySlug, roomId: room.id, input: { status } },
      {
        onSuccess: () => {
          toast.success(`Room ${room.number} marked ${roomStatusLabel[status].toLowerCase()}`);
          onClose();
        },
      },
    );
  }

  const footer =
    room && scope.canManageRooms && actions.length ? (
      <div className={cn("grid gap-2", actions.length > 1 && "grid-cols-2")}>
        {actions.map((action, index) => (
          <Button
            key={action.status}
            variant={index === 0 ? "default" : "outline"}
            className="h-12 rounded-xl text-[15px] font-semibold"
            disabled={updateStatus.isPending}
            onClick={() => setStatus(action.status)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    ) : null;
  const error = errorMessage(updateStatus.error, "The room could not be updated.");

  return (
    <BottomSheet
      open={roomId !== null}
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={room ? `Room ${room.number}` : "Room"}
      footer={footer}
    >
      {room ? (
        <div className="grid gap-5">
          <RoomPhoto url={getRoomTypePhotoUrl(photos, room.roomType)} className="aspect-[16/9] w-full rounded-2xl" />
          <div>
            <p className="text-xl font-semibold tracking-tight">{room.roomType || `Room ${room.number}`}</p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {[room.floor ? `Floor ${room.floor}` : null, room.nightlyRateMinor !== null ? `${formatMoneyWholeRupees(room.nightlyRateMinor)} a night` : "No nightly rate"]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className={cn("mt-1 text-sm font-medium", roomStatusClassName[room.status])}>{roomStatusLabel[room.status]}</p>
          </div>
          {error ? (
            <p role="alert" className="rounded-xl bg-destructive-tint px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Link
            to="/hotel/$organizationSlug/$propertySlug/rooms"
            params={{ organizationSlug: scope.organizationSlug, propertySlug: scope.propertySlug }}
            className="w-fit text-sm font-semibold underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open rooms
          </Link>
        </div>
      ) : null}
    </BottomSheet>
  );
}
