import { z } from "zod";

import { countryCodeSchema, draftTextSchema, pastDateSchema } from "./identity";

export const companionProfileInputSchema = z.object({
  legalFirstName: draftTextSchema(150),
  legalLastName: draftTextSchema(150),
  dateOfBirth: pastDateSchema,
  relationship: draftTextSchema(100),
  nationality: countryCodeSchema,
});

export const companionProfileMissingFieldSchema = z.enum([
  "legalFirstName",
  "legalLastName",
  "dateOfBirth",
  "relationship",
  "nationality",
]);

const companionReadinessSchema = z.object({
  isReady: z.boolean(),
  missingFields: z.array(companionProfileMissingFieldSchema),
});

export const companionProfileSchema = companionProfileInputSchema.extend({
  id: z.number().int().positive(),
  isMinor: z.boolean().nullable(),
  readiness: companionReadinessSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const companionProfileListResponseSchema = z.object({
  companions: z.array(companionProfileSchema),
});

export type CompanionProfileInput = z.infer<typeof companionProfileInputSchema>;
export type CompanionProfileMissingField = z.infer<
  typeof companionProfileMissingFieldSchema
>;
export type CompanionProfile = z.infer<typeof companionProfileSchema>;
export type CompanionProfileListResponse = z.infer<
  typeof companionProfileListResponseSchema
>;
