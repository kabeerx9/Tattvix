// Local-only stand-in for the hotel mutations (assign room, check out, set
// room status). No API calls; state resets when the variant re-mounts.
import type { HotelRoom, HotelStayListItem } from "@tattvix/contracts";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  getInHouse,
  getLeavingToday,
  getNeedsAction,
  getRoomStats,
  localDayKey,
} from "@/features/hotel-overview/metrics";

import { createMockHotel, dayOffsetKey, type MockHotel } from "./data";

export type SettableRoomStatus = "VACANT" | "CLEANING" | "MAINTENANCE";

export function useMockHotel() {
  const [hotel, setHotel] = useState<MockHotel>(() => createMockHotel());
  const todayKey = localDayKey(new Date());

  const derived = useMemo(() => {
    const now = new Date();
    const roomsById = new Map(hotel.rooms.map((room) => [room.id, room]));
    const stayByRoomId = new Map<number, HotelStayListItem>();
    for (const stay of hotel.stays) {
      if (stay.operationalStatus === "CHECKED_IN" && stay.room) stayByRoomId.set(stay.room.id, stay);
    }
    const { waiting, toClean } = getNeedsAction(hotel.stays, hotel.rooms);
    const checkedOutToday = hotel.stays.filter(
      (stay) => stay.checkedOutAt && localDayKey(new Date(stay.checkedOutAt)) === todayKey,
    );
    return {
      roomsById,
      stayByRoomId,
      waiting,
      toClean,
      leaving: getLeavingToday(hotel.stays, now),
      inHouse: getInHouse(hotel.stays),
      checkedOutToday,
      stats: getRoomStats(hotel.rooms),
      vacantRooms: hotel.rooms.filter((room) => room.isActive && room.status === "VACANT"),
    };
  }, [hotel, todayKey]);

  function assignRoom(stayId: string, roomId: number, nights: number) {
    const room = derived.roomsById.get(roomId);
    const stay = hotel.stays.find((entry) => entry.id === stayId);
    if (!room || !stay) return;
    setHotel((current) => ({
      rooms: current.rooms.map((entry) => (entry.id === roomId ? { ...entry, status: "OCCUPIED" } : entry)),
      stays: current.stays.map((entry) =>
        entry.id === stayId
          ? {
              ...entry,
              operationalStatus: "CHECKED_IN",
              room: { id: room.id, number: room.number },
              checkedInAt: new Date().toISOString(),
              expectedCheckOutDate: dayOffsetKey(new Date(), nights),
            }
          : entry,
      ),
    }));
    toast(`${stay.guestName} checked in to room ${room.number}`);
  }

  function checkOut(stayId: string) {
    const stay = hotel.stays.find((entry) => entry.id === stayId);
    if (!stay) return;
    setHotel((current) => ({
      rooms: current.rooms.map((entry) =>
        stay.room && entry.id === stay.room.id ? { ...entry, status: "CLEANING" } : entry,
      ),
      stays: current.stays.map((entry) =>
        entry.id === stayId
          ? { ...entry, operationalStatus: "CHECKED_OUT", status: "CLOSED", checkedOutAt: new Date().toISOString() }
          : entry,
      ),
    }));
    toast(`${stay.guestName} checked out${stay.room ? ` · room ${stay.room.number} sent to cleaning` : ""}`);
  }

  function setRoomStatus(roomId: number, status: SettableRoomStatus) {
    const room = derived.roomsById.get(roomId);
    if (!room) return;
    setHotel((current) => ({
      ...current,
      rooms: current.rooms.map((entry) => (entry.id === roomId ? { ...entry, status } : entry)),
    }));
    toast(`Room ${room.number} marked ${statusLabel[status].toLowerCase()}`);
  }

  return { ...hotel, ...derived, todayKey, assignRoom, checkOut, setRoomStatus };
}

export type MockHotelState = ReturnType<typeof useMockHotel>;

export const statusLabel: Record<HotelRoom["status"], string> = {
  VACANT: "Ready",
  OCCUPIED: "Occupied",
  CLEANING: "Cleaning",
  MAINTENANCE: "Maintenance",
};

/** Text colour for a room status line (Airbnb-style coloured status text). */
export const statusText: Record<HotelRoom["status"], string> = {
  VACANT: "text-primary",
  OCCUPIED: "text-foreground",
  CLEANING: "text-warning",
  MAINTENANCE: "text-destructive",
};

export const statusDot: Record<HotelRoom["status"], string> = {
  VACANT: "bg-primary",
  OCCUPIED: "bg-foreground",
  CLEANING: "bg-warning",
  MAINTENANCE: "bg-destructive",
};
