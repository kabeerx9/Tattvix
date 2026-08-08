import { z } from "zod";

import { identityAccessActionSchema } from "./check-in";

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

// --- Platform oversight ---
//
// Super-admin oversight is read-only and privacy-constrained: it may show
// stay counts/statuses and audit metadata, but must NEVER expose identity
// document images, document numbers, or presigned URLs. The audit feed
// merges two distinct audit sources into one paginated response using a
// discriminated "kind" field, rather than two endpoints the web client
// would have to interleave itself:
//   - IDENTITY_ACCESS: who viewed/downloaded a guest's identity details
//     (from IdentityAccessAudit, stay-scoped).
//   - PLATFORM: platform-admin actions like onboarding or membership
//     changes (from PlatformAuditLog, organization-scoped).

export const platformOversightStatusCountsSchema = z.object({
  pendingCheckIn: z.number().int().nonnegative(),
  checkedIn: z.number().int().nonnegative(),
  checkedOut: z.number().int().nonnegative(),
}).strict();

export const platformOversightPropertyStaysSchema = z.object({
  propertyId: z.number(),
  propertyName: z.string(),
  organizationName: z.string(),
  organizationSlug: z.string(),
  statusCounts: platformOversightStatusCountsSchema,
  totalStays: z.number().int().nonnegative(),
}).strict();

export const platformOversightStaysResponseSchema = z.object({
  properties: z.array(platformOversightPropertyStaysSchema),
}).strict();

export const platformAuditActionSchema = z.enum([
  "PROPERTY_CREATED",
  "MEMBER_ADDED",
  "MEMBER_ROLE_CHANGED",
  "MEMBER_DEACTIVATED",
  "MEMBER_REACTIVATED",
]);

const dateTimeSchema = z.iso.datetime({ offset: true });

export const platformOversightIdentityAuditEntrySchema = z.object({
  kind: z.literal("IDENTITY_ACCESS"),
  id: z.string(),
  at: dateTimeSchema,
  actorEmail: z.string(),
  action: identityAccessActionSchema,
  organizationSlug: z.string(),
  propertyName: z.string(),
  stayId: z.uuid(),
}).strict();

export const platformOversightPlatformAuditEntrySchema = z.object({
  kind: z.literal("PLATFORM"),
  id: z.string(),
  at: dateTimeSchema,
  actorEmail: z.string(),
  action: platformAuditActionSchema,
  organizationSlug: z.string(),
  target: z.string(),
}).strict();

export const platformOversightAuditEntrySchema = z.discriminatedUnion("kind", [
  platformOversightIdentityAuditEntrySchema,
  platformOversightPlatformAuditEntrySchema,
]);

export const platformOversightAuditResponseSchema = z.object({
  entries: z.array(platformOversightAuditEntrySchema),
}).strict();

export const platformOversightAuditQuerySchema = z.object({
  organizationSlug: z.string().trim().min(1).max(255).optional(),
  action: z.string().trim().min(1).max(32).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
}).strict();

// --- Weekly check-ins (pilot-adoption trendline) ---
//
// Aggregates only: check-in counts per property per ISO week (Monday start).
// Weeks with zero check-ins for a property are simply absent from `rows` —
// the client fills the gaps with 0 rather than the server padding every
// property x week combination it has never seen a check-in for.

export const platformOversightWeeklyCheckInsQuerySchema = z.object({
  weeks: z.coerce.number().int().positive().max(26).optional(),
}).strict();

export const platformOversightWeeklyCheckInsRowSchema = z.object({
  weekStart: z.iso.date(),
  propertyId: z.number(),
  propertyName: z.string(),
  organizationSlug: z.string(),
  checkIns: z.number().int().nonnegative(),
}).strict();

export const platformOversightWeeklyCheckInsResponseSchema = z.object({
  rows: z.array(platformOversightWeeklyCheckInsRowSchema),
}).strict();

export type PlatformOversightStatusCounts = z.infer<
  typeof platformOversightStatusCountsSchema
>;
export type PlatformOversightPropertyStays = z.infer<
  typeof platformOversightPropertyStaysSchema
>;
export type PlatformOversightStaysResponse = z.infer<
  typeof platformOversightStaysResponseSchema
>;
export type PlatformAuditAction = z.infer<typeof platformAuditActionSchema>;
export type PlatformOversightIdentityAuditEntry = z.infer<
  typeof platformOversightIdentityAuditEntrySchema
>;
export type PlatformOversightPlatformAuditEntry = z.infer<
  typeof platformOversightPlatformAuditEntrySchema
>;
export type PlatformOversightAuditEntry = z.infer<
  typeof platformOversightAuditEntrySchema
>;
export type PlatformOversightAuditResponse = z.infer<
  typeof platformOversightAuditResponseSchema
>;
export type PlatformOversightAuditQuery = z.infer<
  typeof platformOversightAuditQuerySchema
>;
export type PlatformOversightWeeklyCheckInsQuery = z.infer<
  typeof platformOversightWeeklyCheckInsQuerySchema
>;
export type PlatformOversightWeeklyCheckInsRow = z.infer<
  typeof platformOversightWeeklyCheckInsRowSchema
>;
export type PlatformOversightWeeklyCheckInsResponse = z.infer<
  typeof platformOversightWeeklyCheckInsResponseSchema
>;

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
