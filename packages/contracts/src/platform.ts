import { z } from "zod";

const namedSlugSchema = z.object({
  name: z.string().trim().min(1).max(255),
  slug: z.string().trim().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
}).strict();

export const platformOrganizationOnboardingInputSchema = z.object({
  organization: namedSlugSchema,
  property: namedSlugSchema,
  ownerEmail: z.email(),
}).strict();

export const platformOrganizationOnboardingResponseSchema = z.object({
  organization: namedSlugSchema.extend({ id: z.number() }).strict(),
  property: namedSlugSchema.extend({ id: z.number() }).strict(),
  owner: z.object({
    id: z.number(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }).strict(),
  membership: z.object({
    id: z.number(),
    role: z.literal("OWNER"),
    hasAllProperties: z.literal(true),
  }).strict(),
}).strict();

export const platformUserSearchParamsSchema = z.object({
  email: z.string().trim().min(3).max(100),
}).strict();

export const platformUserSearchResultSchema = z.object({
  id: z.number(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  imageUrl: z.string(),
}).strict();

export const platformUserSearchResponseSchema = z.object({
  users: z.array(platformUserSearchResultSchema).max(10),
}).strict();

export type PlatformOrganizationOnboardingInput = z.infer<
  typeof platformOrganizationOnboardingInputSchema
>;
export type PlatformOrganizationOnboardingResponse = z.infer<
  typeof platformOrganizationOnboardingResponseSchema
>;
export type PlatformUserSearchParams = z.infer<typeof platformUserSearchParamsSchema>;
export type PlatformUserSearchResult = z.infer<typeof platformUserSearchResultSchema>;
export type PlatformUserSearchResponse = z.infer<typeof platformUserSearchResponseSchema>;
