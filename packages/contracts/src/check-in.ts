import { z } from "zod";
import { moneyMinorSchema, propertyDetailsSchema } from "./billing";

import { guestProfileInputSchema } from "./guest-profile";
import {
  identityDocumentImageAccessResponseSchema,
  identityDocumentImageSideSchema,
  identityDocumentTypeSchema,
} from "./identity-document";
import { companionProfileInputSchema } from "./companion-profile";

const dateTimeSchema = z.iso.datetime({ offset: true });

export const stayStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "CLOSED",
  "REVOKED",
]);

export const operationalStayStatusSchema = z.enum([
  "PENDING_CHECK_IN",
  "CHECKED_IN",
  "CHECKED_OUT",
]);

export const roomStatusSchema = z.enum([
  "VACANT",
  "OCCUPIED",
  "CLEANING",
  "MAINTENANCE",
]);

export const roomSummarySchema = z.object({
  id: z.number().int().positive(),
  number: z.string().min(1).max(32),
  floor: z.string().max(32),
  roomType: z.string().max(100),
  status: roomStatusSchema,
  isActive: z.boolean(),
  nightlyRateMinor: moneyMinorSchema.nullable().optional().default(null),
});

// A stay's assigned room, as embedded in stay payloads (guest and hotel
// alike). Deliberately minimal: room number is the only thing anyone needs
// to identify "which door" — floor/type/status/isActive are operational
// room-inventory internals (see roomSummarySchema), not stay facts, and are
// only ever read off the standalone rooms list, never off a stay.room. For
// the guest surface specifically this also keeps hotel-internal room
// housekeeping state out of a response a guest can inspect.
export const stayRoomSummarySchema = z.object({
  id: z.number().int().positive(),
  number: z.string().min(1).max(32),
});

export const checkInPropertySchema = z.object({
  details: propertyDetailsSchema.optional(),
  id: z.number().int().positive(),
  name: z.string().min(1),
  slug: z.string().min(1),
  organization: z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    slug: z.string().min(1),
  }),
});

export const guestStaySchema = z.object({
  id: z.uuid(),
  status: stayStatusSchema,
  operationalStatus: operationalStayStatusSchema,
  room: stayRoomSummarySchema.nullable(),
  submittedAt: dateTimeSchema.nullable(),
  closedAt: dateTimeSchema.nullable(),
  checkedInAt: dateTimeSchema.nullable(),
  checkedOutAt: dateTimeSchema.nullable(),
  hotelAccessExpiresAt: dateTimeSchema.nullable(),
});

export const identityAccessActionSchema = z.enum([
  "DETAILS_VIEWED",
  "DOCUMENT_VIEWED",
  "STAY_CLOSED",
  "CONSENT_REVOKED",
]);

export const guestShareSchema = guestStaySchema.extend({
  property: checkInPropertySchema,
  accessEvents: z.array(
    z.object({
      action: identityAccessActionSchema,
      imageSide: identityDocumentImageSideSchema.nullable(),
      companionId: z.number().int().positive().nullable().optional(),
      companionName: z.string().nullable().optional(),
      createdAt: dateTimeSchema,
    }),
  ),
});

export const guestShareListResponseSchema = z.object({
  stays: z.array(guestShareSchema),
});

export const checkInContextSchema = z.object({
  property: checkInPropertySchema,
  tokenExpiresAt: dateTimeSchema,
  accessPolicy: z.object({
    maximumDays: z.number().int().positive(),
    postCheckoutGraceHours: z.number().int().positive(),
  }),
  existingStay: guestStaySchema.nullable(),
});

export const guestCheckInSubmitInputSchema = z
  .object({
    identityDocumentId: z.number().int().positive(),
    companionIds: z.array(z.number().int().positive()).max(20),
    companionDocuments: z
      .array(
        z.object({
          companionId: z.number().int().positive(),
          identityDocumentId: z.number().int().positive(),
        }),
      )
      .max(20)
      .optional(),
    consentAccepted: z.literal(true),
  })
  .superRefine((input, ctx) => {
    const seen = new Set<number>();
    for (const [index, choice] of (input.companionDocuments ?? []).entries()) {
      if (
        !input.companionIds.includes(choice.companionId) ||
        seen.has(choice.companionId)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["companionDocuments", index, "companionId"],
          message: "Choose at most one document for each selected companion.",
        });
      }
      seen.add(choice.companionId);
    }
  });

export const hotelQrTokenResponseSchema = z.object({
  token: z.string().min(32),
  checkInPath: z.string().startsWith("/check-in/"),
  expiresAt: dateTimeSchema,
  property: checkInPropertySchema,
});

export const hotelIdentityAccessReasonSchema = z.enum([
  "ACTIVE",
  "REVOKED",
  "EXPIRED",
  "NOT_SUBMITTED",
]);

export const hotelIdentityAccessSchema = z.object({
  isActive: z.boolean(),
  reason: hotelIdentityAccessReasonSchema,
  expiresAt: dateTimeSchema.nullable(),
});

export const hotelStayListItemSchema = guestStaySchema.extend({
  guestName: z.string().min(1),
  companionCount: z.number().int().nonnegative(),
  identityAccess: hotelIdentityAccessSchema,
});

export const hotelStayListResponseSchema = z.object({
  stays: z.array(hotelStayListItemSchema),
});

// Query params for the hotel stay list. `search` matches against the shared
// identity snapshot's guest name (never the live guest profile — see
// build_hotel_stay_list_item on the server), so a name change on a guest's
// profile after check-in does not retroactively change what search finds.
export const hotelStayListQuerySchema = z.object({
  search: z.string().trim().min(2).optional(),
  operationalStatus: operationalStayStatusSchema.optional(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
});

export const sharedDocumentSchema = z.object({
  documentType: identityDocumentTypeSchema,
  documentNumber: z.string().min(1).max(64),
  nameOnDocument: z.string().min(1).max(300),
  issuingCountry: z.string().length(2),
  expiryDate: z.iso.date().nullable(),
});

export const sharedCompanionSchema = companionProfileInputSchema.extend({
  isMinor: z.boolean().nullable(),
  id: z.number().int().positive().optional(),
  document: sharedDocumentSchema.nullable().optional(),
  images: z
    .array(z.object({ side: identityDocumentImageSideSchema }))
    .default([]),
});

export const sharedIdentitySnapshotSchema = z.object({
  guest: guestProfileInputSchema,
  companions: z.array(sharedCompanionSchema),
  document: sharedDocumentSchema,
  images: z.array(
    z.object({
      side: identityDocumentImageSideSchema,
    }),
  ),
  sharedAt: dateTimeSchema,
});

export const hotelStayDetailSchema = hotelStayListItemSchema.extend({
  snapshot: sharedIdentitySnapshotSchema.nullable(),
});

export const hotelStayImageAccessResponseSchema =
  identityDocumentImageAccessResponseSchema;

export type StayStatus = z.infer<typeof stayStatusSchema>;
export type OperationalStayStatus = z.infer<typeof operationalStayStatusSchema>;
export type RoomStatus = z.infer<typeof roomStatusSchema>;
export type RoomSummary = z.infer<typeof roomSummarySchema>;
export type StayRoomSummary = z.infer<typeof stayRoomSummarySchema>;
export type CheckInProperty = z.infer<typeof checkInPropertySchema>;
export type GuestStay = z.infer<typeof guestStaySchema>;
export type IdentityAccessAction = z.infer<typeof identityAccessActionSchema>;
export type GuestShare = z.infer<typeof guestShareSchema>;
export type GuestShareListResponse = z.infer<
  typeof guestShareListResponseSchema
>;
export type CheckInContext = z.infer<typeof checkInContextSchema>;
export type GuestCheckInSubmitInput = z.infer<
  typeof guestCheckInSubmitInputSchema
>;
export type HotelQrTokenResponse = z.infer<typeof hotelQrTokenResponseSchema>;
export type HotelIdentityAccessReason = z.infer<
  typeof hotelIdentityAccessReasonSchema
>;
export type HotelStayListItem = z.infer<typeof hotelStayListItemSchema>;
export type HotelStayListResponse = z.infer<typeof hotelStayListResponseSchema>;
export type HotelStayListQuery = z.infer<typeof hotelStayListQuerySchema>;
export type SharedIdentitySnapshot = z.infer<
  typeof sharedIdentitySnapshotSchema
>;
export type HotelStayDetail = z.infer<typeof hotelStayDetailSchema>;
