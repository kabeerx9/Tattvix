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

export const platformMembershipRoleSchema = z.enum([
  "OWNER",
  "MANAGER",
  "RECEPTION",
]);

export const platformOrganizationSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  isActive: z.boolean(),
  propertyCount: z.number().int().nonnegative(),
  memberCount: z.number().int().nonnegative(),
}).strict();

export const platformOrganizationListResponseSchema = z.object({
  organizations: z.array(platformOrganizationSummarySchema),
}).strict();

export const platformPropertySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  isActive: z.boolean(),
}).strict();

export const platformMemberSchema = z.object({
  id: z.number(),
  role: platformMembershipRoleSchema,
  isActive: z.boolean(),
  hasAllProperties: z.boolean(),
  user: z.object({
    id: z.number(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    imageUrl: z.string(),
  }).strict(),
}).strict();

export const platformOrganizationDetailSchema = z.object({
  organization: z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    isActive: z.boolean(),
  }).strict(),
  properties: z.array(platformPropertySchema),
  members: z.array(platformMemberSchema),
}).strict();

export const platformPropertyCreateInputSchema = namedSlugSchema;

export const platformMemberAddInputSchema = z.object({
  email: z.email(),
  role: platformMembershipRoleSchema,
}).strict();

export const platformMemberUpdateInputSchema = z.object({
  role: platformMembershipRoleSchema.optional(),
  isActive: z.boolean().optional(),
}).strict().refine(
  (value) => value.role !== undefined || value.isActive !== undefined,
  { message: "Provide role or isActive." },
);

export type PlatformMembershipRole = z.infer<typeof platformMembershipRoleSchema>;
export type PlatformOrganizationSummary = z.infer<
  typeof platformOrganizationSummarySchema
>;
export type PlatformOrganizationListResponse = z.infer<
  typeof platformOrganizationListResponseSchema
>;
export type PlatformProperty = z.infer<typeof platformPropertySchema>;
export type PlatformMember = z.infer<typeof platformMemberSchema>;
export type PlatformOrganizationDetail = z.infer<
  typeof platformOrganizationDetailSchema
>;
export type PlatformPropertyCreateInput = z.infer<
  typeof platformPropertyCreateInputSchema
>;
export type PlatformMemberAddInput = z.infer<typeof platformMemberAddInputSchema>;
export type PlatformMemberUpdateInput = z.infer<
  typeof platformMemberUpdateInputSchema
>;
