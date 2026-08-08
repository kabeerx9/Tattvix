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

// --- Hotel operational reports ---
//
// Privacy-constrained by design: reports surface only what operations staff
// need to run the front desk — names (from the shared snapshot, same
// derivation as hotelGuestStaySchema), room numbers, timestamps, and
// statuses. Never document numbers or other identity-document fields. The
// register is the one report with a CSV export (see the web reports
// feature), and that export must carry exactly these fields too.

export const hotelReportDateRangeQuerySchema = z.object({
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
});

export const hotelReportRegisterEntrySchema = z.object({
  stayId: z.uuid(),
  guestName: z.string().min(1),
  companionCount: z.number().int().nonnegative(),
  roomNumber: z.string().nullable(),
  checkedInAt: dateTimeSchema.nullable(),
  checkedOutAt: dateTimeSchema.nullable(),
  operationalStatus: operationalStayStatusSchema,
});

export const hotelReportRegisterResponseSchema = z.object({
  dateFrom: z.iso.date(),
  dateTo: z.iso.date(),
  entries: z.array(hotelReportRegisterEntrySchema),
});

export const hotelReportInHouseEntrySchema = z.object({
  stayId: z.uuid(),
  guestName: z.string().min(1),
  roomNumber: z.string().nullable(),
  checkedInAt: dateTimeSchema.nullable(),
});

export const hotelReportInHouseResponseSchema = z.object({
  entries: z.array(hotelReportInHouseEntrySchema),
});

export const hotelReportRoomStatusCountsSchema = z.object({
  VACANT: z.number().int().nonnegative(),
  OCCUPIED: z.number().int().nonnegative(),
  CLEANING: z.number().int().nonnegative(),
  MAINTENANCE: z.number().int().nonnegative(),
});

export const hotelReportOccupancyResponseSchema = z.object({
  occupiedRooms: z.number().int().nonnegative(),
  activeRooms: z.number().int().nonnegative(),
  statusCounts: hotelReportRoomStatusCountsSchema,
});

export const hotelReportStayStatusCountsSchema = z.object({
  pendingCheckIn: z.number().int().nonnegative(),
  checkedIn: z.number().int().nonnegative(),
  checkedOut: z.number().int().nonnegative(),
});

export const hotelReportStatusCountsResponseSchema = z.object({
  dateFrom: z.iso.date(),
  dateTo: z.iso.date(),
  counts: hotelReportStayStatusCountsSchema,
});

export type HotelReportDateRangeQuery = z.infer<
  typeof hotelReportDateRangeQuerySchema
>;
export type HotelReportRegisterEntry = z.infer<
  typeof hotelReportRegisterEntrySchema
>;
export type HotelReportRegisterResponse = z.infer<
  typeof hotelReportRegisterResponseSchema
>;
export type HotelReportInHouseEntry = z.infer<
  typeof hotelReportInHouseEntrySchema
>;
export type HotelReportInHouseResponse = z.infer<
  typeof hotelReportInHouseResponseSchema
>;
export type HotelReportRoomStatusCounts = z.infer<
  typeof hotelReportRoomStatusCountsSchema
>;
export type HotelReportOccupancyResponse = z.infer<
  typeof hotelReportOccupancyResponseSchema
>;
export type HotelReportStayStatusCounts = z.infer<
  typeof hotelReportStayStatusCountsSchema
>;
export type HotelReportStatusCountsResponse = z.infer<
  typeof hotelReportStatusCountsResponseSchema
>;

export { roomStatusSchema };
