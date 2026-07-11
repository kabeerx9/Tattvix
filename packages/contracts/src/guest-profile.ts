import { z } from "zod";

const draftText = (maximum: number) =>
  z.string().trim().max(maximum).default("");

const countryCode = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(
    z.union([
      z.literal(""),
      z.string().regex(/^[A-Z]{2}$/, "Use a two-letter country code"),
    ]),
  );

export const guestProfileInputSchema = z.object({
  legalFirstName: draftText(150),
  legalLastName: draftText(150),
  phoneNumber: draftText(32),
  dateOfBirth: z
    .iso.date()
    .nullable()
    .refine(
      (value) => value === null || value < new Date().toISOString().slice(0, 10),
      "Date of birth must be in the past",
    ),
  nationality: countryCode,
  addressLine1: draftText(255),
  addressLine2: draftText(255),
  city: draftText(120),
  stateRegion: draftText(120),
  postalCode: draftText(20),
  country: countryCode,
  emergencyContactName: draftText(150),
  emergencyContactPhone: draftText(32),
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
