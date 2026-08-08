import { z } from "zod";

import {
  operationalStayStatusSchema,
  roomStatusSchema,
  roomSummarySchema,
} from "./check-in";

const dateTimeSchema = z.iso.datetime({ offset: true });

export const hotelRoomSchema = roomSummarySchema;

export const hotelRoomListResponseSchema = z.object({
  rooms: z.array(hotelRoomSchema),
});

export const hotelRoomCreateInputSchema = z.object({
  number: z.string().trim().min(1).max(32),
  floor: z.string().trim().max(32),
  roomType: z.string().trim().max(100),
});

export const hotelRoomStatusInputSchema = z.object({
  status: z.enum(["VACANT", "CLEANING", "MAINTENANCE"]),
});

export const hotelStayCheckInInputSchema = z.object({
  roomId: z.number().int().positive(),
});

export const hotelGuestStaySchema = z.object({
  id: z.uuid(),
  guestName: z.string().min(1),
  companionCount: z.number().int().nonnegative(),
  operationalStatus: operationalStayStatusSchema,
  room: roomSummarySchema.nullable(),
  checkedInAt: dateTimeSchema.nullable(),
  checkedOutAt: dateTimeSchema.nullable(),
});

export const hotelGuestListResponseSchema = z.object({
  current: z.array(hotelGuestStaySchema),
  history: z.array(hotelGuestStaySchema),
});

export type HotelRoom = z.infer<typeof hotelRoomSchema>;
export type HotelRoomListResponse = z.infer<
  typeof hotelRoomListResponseSchema
>;
export type HotelRoomCreateInput = z.infer<
  typeof hotelRoomCreateInputSchema
>;
export type HotelRoomStatusInput = z.infer<
  typeof hotelRoomStatusInputSchema
>;
export type HotelStayCheckInInput = z.infer<
  typeof hotelStayCheckInInputSchema
>;
export type HotelGuestStay = z.infer<typeof hotelGuestStaySchema>;
export type HotelGuestListResponse = z.infer<
  typeof hotelGuestListResponseSchema
>;

export { roomStatusSchema };
