import { z } from "zod";

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

export const checkInPropertySchema = z.object({
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
  submittedAt: dateTimeSchema.nullable(),
  closedAt: dateTimeSchema.nullable(),
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

export const guestCheckInSubmitInputSchema = z.object({
  identityDocumentId: z.number().int().positive(),
  companionIds: z.array(z.number().int().positive()).max(20),
  consentAccepted: z.literal(true),
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

export const sharedCompanionSchema = companionProfileInputSchema.extend({
  isMinor: z.boolean().nullable(),
});

export const sharedDocumentSchema = z.object({
  documentType: identityDocumentTypeSchema,
  documentNumber: z.string().min(1).max(64),
  nameOnDocument: z.string().min(1).max(300),
  issuingCountry: z.string().length(2),
  expiryDate: z.iso.date().nullable(),
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
export type SharedIdentitySnapshot = z.infer<
  typeof sharedIdentitySnapshotSchema
>;
export type HotelStayDetail = z.infer<typeof hotelStayDetailSchema>;
