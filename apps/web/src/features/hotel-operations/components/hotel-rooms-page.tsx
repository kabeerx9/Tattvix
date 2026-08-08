import type { HotelRoom, HotelRoomCreateInput } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { BedDouble, BrushCleaning, CircleCheck, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, Surface } from "@/components/design-system";
import { ApiError } from "@/lib/api";

import { hotelOperationsMutations } from "../mutations";
import { hotelOperationsQueries } from "../queries";

const EMPTY_ROOM: HotelRoomCreateInput = {
  number: "",
  floor: "",
  roomType: "",
};

export function HotelRoomsPage({
  organizationSlug,
  propertySlug,
  propertyName,
  canManage,
}: {
  organizationSlug: string;
  propertySlug: string;
  propertyName: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(
    hotelOperationsQueries.rooms(organizationSlug, propertySlug),
  );
  const [showForm, setShowForm] = useState(false);
  const [roomInput, setRoomInput] = useState(EMPTY_ROOM);
  const createMutation = useMutation(
    hotelOperationsMutations.createRoom(queryClient),
  );
  const statusMutation = useMutation(
    hotelOperationsMutations.updateRoomStatus(queryClient),
  );

  function createRoom(event: React.FormEvent) {
    event.preventDefault();
    createMutation.mutate(
      {
        organizationSlug,
        propertySlug,
        input: roomInput,
      },
      {
        onSuccess: () => {
          setRoomInput(EMPTY_ROOM);
          setShowForm(false);
          toast.success(`Room ${roomInput.number.trim()} added`);
        },
      },
    );
  }

  function markReady(room: HotelRoom) {
    statusMutation.mutate(
      {
        organizationSlug,
        propertySlug,
        roomId: room.id,
        input: { status: "VACANT" },
      },
      { onSuccess: () => toast.success(`Room ${room.number} is ready`) },
    );
  }

  const error = [createMutation.error, statusMutation.error].find(Boolean);
  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error
        ? "The room inventory could not be updated."
        : null;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <PageHeader
        eyebrow={propertyName}
        title="Rooms"
        description="Keep room availability honest. Check-in occupies a room; checkout sends it to cleaning until staff marks it ready."
        action={
          canManage ? (
            <Button onClick={() => setShowForm((value) => !value)}>
              <Plus />
              Add room
            </Button>
          ) : undefined
        }
      />

      {showForm ? (
        <Surface className="p-5 sm:p-6">
          <form
            className="grid gap-4 md:grid-cols-[1fr_1fr_1.5fr_auto] md:items-end"
            onSubmit={createRoom}
          >
            <Field label="Room number">
              <Input
                required
                autoFocus
                value={roomInput.number}
                onChange={(event) =>
                  setRoomInput((current) => ({
                    ...current,
                    number: event.target.value,
                  }))
                }
                placeholder="101"
              />
            </Field>
            <Field label="Floor">
              <Input
                value={roomInput.floor}
                onChange={(event) =>
                  setRoomInput((current) => ({
                    ...current,
                    floor: event.target.value,
                  }))
                }
                placeholder="1"
              />
            </Field>
            <Field label="Room type">
              <Input
                value={roomInput.roomType}
                onChange={(event) =>
                  setRoomInput((current) => ({
                    ...current,
                    roomType: event.target.value,
                  }))
                }
                placeholder="Deluxe"
              />
            </Field>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Save room"}
            </Button>
          </form>
        </Surface>
      ) : null}

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            canManage={canManage}
            isUpdating={statusMutation.isPending}
            onMarkReady={() => markReady(room)}
          />
        ))}
      </div>

      {!data.rooms.length ? (
        <Surface className="grid place-items-center gap-4 p-10 text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-muted">
            <BedDouble className="size-6" />
          </span>
          <div>
            <h2 className="text-base font-semibold">No rooms configured</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Add the first room before reception confirms a guest check-in.
            </p>
          </div>
        </Surface>
      ) : null}
    </div>
  );
}

function RoomCard({
  room,
  canManage,
  isUpdating,
  onMarkReady,
}: {
  room: HotelRoom;
  canManage: boolean;
  isUpdating: boolean;
  onMarkReady: () => void;
}) {
  return (
    <Surface className="p-5">
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-11 place-items-center rounded-xl bg-muted">
          <BedDouble className="size-5" />
        </span>
        <StatusBadge status={room.status} />
      </div>
      <h2 className="mt-5 text-xl font-semibold">Room {room.number}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {[room.roomType, room.floor ? `Floor ${room.floor}` : ""]
          .filter(Boolean)
          .join(" · ") || "Standard room"}
      </p>
      {canManage && room.status === "CLEANING" ? (
        <Button
          className="mt-5 w-full"
          variant="outline"
          disabled={isUpdating}
          onClick={onMarkReady}
        >
          <CircleCheck />
          Mark ready
        </Button>
      ) : room.status === "OCCUPIED" ? (
        <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <BedDouble className="size-3.5" />
          Released automatically at checkout
        </p>
      ) : room.status === "CLEANING" ? (
        <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <BrushCleaning className="size-3.5" />
          Awaiting housekeeping completion
        </p>
      ) : null}
    </Surface>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: HotelRoom["status"] }) {
  const label = {
    VACANT: "Vacant",
    OCCUPIED: "Occupied",
    CLEANING: "Cleaning",
    MAINTENANCE: "Maintenance",
  }[status];
  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {label}
    </span>
  );
}
