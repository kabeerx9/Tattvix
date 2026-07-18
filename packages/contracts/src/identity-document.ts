import { z } from "zod";

import { countryCodeSchema, draftTextSchema } from "./identity";

export const identityDocumentTypeSchema = z.enum([
  "AADHAAR",
  "PASSPORT",
  "DRIVING_LICENCE",
  "VOTER_ID",
]);

export const identityDocumentImageSideSchema = z.enum(["FRONT", "BACK"]);

export const identityDocumentInputSchema = z.object({
  documentType: z.union([z.literal(""), identityDocumentTypeSchema]),
  documentNumber: draftTextSchema(64),
  nameOnDocument: draftTextSchema(300),
  issuingCountry: countryCodeSchema,
  expiryDate: z.iso.date().nullable(),
});

export const identityDocumentMissingFieldSchema = z.enum([
  "documentType",
  "documentNumber",
  "nameOnDocument",
  "issuingCountry",
  "expiryDate",
  "frontImage",
  "backImage",
]);

export const identityDocumentImageSchema = z.object({
  isUploaded: z.boolean(),
  contentType: z.string(),
  contentLength: z.number().int().positive().nullable(),
});

export const identityDocumentSchema = identityDocumentInputSchema.extend({
  id: z.number().int().positive(),
  requirements: z.object({
    expiryDateRequired: z.boolean(),
    backImageRequired: z.boolean(),
  }),
  images: z.object({
    front: identityDocumentImageSchema,
    back: identityDocumentImageSchema,
  }),
  readiness: z.object({
    isReady: z.boolean(),
    missingFields: z.array(identityDocumentMissingFieldSchema),
  }),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

export const identityDocumentListResponseSchema = z.object({
  documents: z.array(identityDocumentSchema),
});

export const identityDocumentUploadInputSchema = z.object({
  side: identityDocumentImageSideSchema,
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  contentLength: z.number().int().positive(),
});

export const identityDocumentUploadResponseSchema = z.object({
  objectKey: z.string().min(1).max(1024),
  url: z.url(),
  method: z.literal("PUT"),
  headers: z.record(z.string(), z.string()),
  expiresInSeconds: z.number().int().positive().max(900),
});

export const identityDocumentUploadFinalizeInputSchema = z.object({
  side: identityDocumentImageSideSchema,
  objectKey: z.string().min(1).max(1024),
});

export const identityDocumentImageAccessInputSchema = z.object({
  side: identityDocumentImageSideSchema,
});

export const identityDocumentImageAccessResponseSchema = z.object({
  url: z.url(),
  expiresInSeconds: z.number().int().positive().max(900),
});

export type IdentityDocumentType = z.infer<typeof identityDocumentTypeSchema>;
export type IdentityDocumentImageSide = z.infer<
  typeof identityDocumentImageSideSchema
>;
export type IdentityDocumentInput = z.infer<
  typeof identityDocumentInputSchema
>;
export type IdentityDocumentMissingField = z.infer<
  typeof identityDocumentMissingFieldSchema
>;
export type IdentityDocument = z.infer<typeof identityDocumentSchema>;
export type IdentityDocumentListResponse = z.infer<
  typeof identityDocumentListResponseSchema
>;
export type IdentityDocumentUploadInput = z.infer<
  typeof identityDocumentUploadInputSchema
>;
export type IdentityDocumentUploadResponse = z.infer<
  typeof identityDocumentUploadResponseSchema
>;
export type IdentityDocumentUploadFinalizeInput = z.infer<
  typeof identityDocumentUploadFinalizeInputSchema
>;
export type IdentityDocumentImageAccessInput = z.infer<
  typeof identityDocumentImageAccessInputSchema
>;
export type IdentityDocumentImageAccessResponse = z.infer<
  typeof identityDocumentImageAccessResponseSchema
>;
