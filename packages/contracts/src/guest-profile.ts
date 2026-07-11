import { z } from "zod";

import { countryCodeSchema, draftTextSchema, pastDateSchema } from "./identity";

export const guestProfileInputSchema = z.object({
  legalFirstName: draftTextSchema(150),
  legalLastName: draftTextSchema(150),
  phoneNumber: draftTextSchema(32),
  dateOfBirth: pastDateSchema,
  nationality: countryCodeSchema,
  addressLine1: draftTextSchema(255),
  addressLine2: draftTextSchema(255),
  city: draftTextSchema(120),
  stateRegion: draftTextSchema(120),
  postalCode: draftTextSchema(20),
  country: countryCodeSchema,
  emergencyContactName: draftTextSchema(150),
  emergencyContactPhone: draftTextSchema(32),
});

export const guestProfileMissingFieldSchema = z.enum([
  "legalFirstName",
  "legalLastName",
  "phoneNumber",
  "dateOfBirth",
  "nationality",
  "addressLine1",
  "city",
  "stateRegion",
  "postalCode",
  "country",
  "identityDocuments",
]);

export const guestProfileResponseSchema = z.object({
  profile: guestProfileInputSchema,
  readiness: z.object({
    isReady: z.boolean(),
    missingFields: z.array(guestProfileMissingFieldSchema),
  }),
  updatedAt: z.iso.datetime({ offset: true }).nullable(),
});

export type GuestProfileInput = z.infer<typeof guestProfileInputSchema>;
export type GuestProfileMissingField = z.infer<
  typeof guestProfileMissingFieldSchema
>;
export type GuestProfileResponse = z.infer<typeof guestProfileResponseSchema>;
