import { queryOptions } from "@tanstack/react-query";
import {
  hotelGuestListResponseSchema,
  hotelRoomListResponseSchema,
  hotelRoomSchema,
  hotelStayDetailSchema,
  type ApiClient,
  type HotelRoomCreateInput,
  type HotelRoomRateInput,
  type HotelRoomStatusInput,
  type HotelStayCheckInInput,
} from "@tattvix/contracts";

export const hotelOperationsKeys = {
  all: ["hotel-operations"] as const,
  property: (organizationSlug: string, propertySlug: string) =>
    [...hotelOperationsKeys.all, organizationSlug, propertySlug] as const,
  rooms: (organizationSlug: string, propertySlug: string) =>
    [...hotelOperationsKeys.property(organizationSlug, propertySlug), "rooms"] as const,
  guests: (organizationSlug: string, propertySlug: string) =>
    [...hotelOperationsKeys.property(organizationSlug, propertySlug), "guests"] as const,
};

function propertyBase(organizationSlug: string, propertySlug: string) {
  return `/api/hotel/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(propertySlug)}`;
}

export function createHotelOperationsApi(client: ApiClient) {
  return {
    listRooms(organizationSlug: string, propertySlug: string) {
      return client.requestJson(`${propertyBase(organizationSlug, propertySlug)}/rooms/`, hotelRoomListResponseSchema);
    },
    createRoom(organizationSlug: string, propertySlug: string, input: HotelRoomCreateInput) {
      return client.requestJson(`${propertyBase(organizationSlug, propertySlug)}/rooms/`, hotelRoomSchema, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    updateRoomStatus(organizationSlug: string, propertySlug: string, roomId: number, input: HotelRoomStatusInput) {
      return client.requestJson(`${propertyBase(organizationSlug, propertySlug)}/rooms/${roomId}/status/`, hotelRoomSchema, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
    updateRoomRate(organizationSlug: string, propertySlug: string, roomId: number, input: HotelRoomRateInput) {
      return client.requestJson(`${propertyBase(organizationSlug, propertySlug)}/rooms/${roomId}/rate/`, hotelRoomSchema, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
    checkIn(organizationSlug: string, propertySlug: string, stayId: string, input: HotelStayCheckInInput) {
      return client.requestJson(`${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/check-in/`, hotelStayDetailSchema, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    checkout(organizationSlug: string, propertySlug: string, stayId: string) {
      return client.requestJson(`${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/checkout/`, hotelStayDetailSchema, {
        method: "POST",
      });
    },
    listGuests(organizationSlug: string, propertySlug: string) {
      return client.requestJson(`${propertyBase(organizationSlug, propertySlug)}/guests/`, hotelGuestListResponseSchema);
    },
  };
}
export type HotelOperationsApi = ReturnType<typeof createHotelOperationsApi>;

export function createHotelOperationsQueries(api: HotelOperationsApi) {
  return {
    rooms: (organizationSlug: string, propertySlug: string) =>
      queryOptions({
        queryKey: hotelOperationsKeys.rooms(organizationSlug, propertySlug),
        queryFn: () => api.listRooms(organizationSlug, propertySlug),
        staleTime: 30_000,
      }),
    guests: (organizationSlug: string, propertySlug: string) =>
      queryOptions({
        queryKey: hotelOperationsKeys.guests(organizationSlug, propertySlug),
        queryFn: () => api.listGuests(organizationSlug, propertySlug),
        staleTime: 15_000,
      }),
  };
}
