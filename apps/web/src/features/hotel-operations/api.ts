import {
  hotelGuestListResponseSchema,
  hotelRoomListResponseSchema,
  hotelRoomSchema,
  hotelStayDetailSchema,
  type HotelRoomCreateInput,
  type HotelRoomStatusInput,
  type HotelStayCheckInInput,
} from "@tattvix/contracts";

import { apiClient } from "@/lib/api";

function propertyBase(organizationSlug: string, propertySlug: string) {
  return `/api/hotel/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(propertySlug)}`;
}

export const hotelOperationsApi = {
  listRooms(organizationSlug: string, propertySlug: string) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/rooms/`,
      hotelRoomListResponseSchema,
    );
  },
  createRoom(
    organizationSlug: string,
    propertySlug: string,
    input: HotelRoomCreateInput,
  ) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/rooms/`,
      hotelRoomSchema,
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  updateRoomStatus(
    organizationSlug: string,
    propertySlug: string,
    roomId: number,
    input: HotelRoomStatusInput,
  ) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/rooms/${roomId}/status/`,
      hotelRoomSchema,
      { method: "PATCH", body: JSON.stringify(input) },
    );
  },
  checkIn(
    organizationSlug: string,
    propertySlug: string,
    stayId: string,
    input: HotelStayCheckInInput,
  ) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/check-in/`,
      hotelStayDetailSchema,
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  checkout(
    organizationSlug: string,
    propertySlug: string,
    stayId: string,
  ) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/checkout/`,
      hotelStayDetailSchema,
      { method: "POST" },
    );
  },
  listGuests(organizationSlug: string, propertySlug: string) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/guests/`,
      hotelGuestListResponseSchema,
    );
  },
};
