import { z } from "zod";

export const permissionSchema = z.enum([
  "hotel:view",
  "hotel:manage",
  "members:view",
  "members:manage",
  "stays:view",
  "stays:update",
  "rooms:view",
  "rooms:manage",
  "rooms:assign",
  "reports:view",
  "platform:admin",
]);

export const platformRoleSchema = z.enum(["SUPER_ADMIN"]);
export const membershipRoleSchema = z.enum(["OWNER", "MANAGER", "RECEPTION"]);

export const propertyAccessSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
}).strict();

export const organizationSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
}).strict();

export const membershipSchema = z.object({
  id: z.number(),
  role: membershipRoleSchema,
  hasAllProperties: z.boolean(),
  permissions: z.array(permissionSchema),
  organization: organizationSummarySchema,
  properties: z.array(propertyAccessSchema),
}).strict();

export const meResponseSchema = z.object({
  id: z.number(),
  clerkId: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
  imageUrl: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  lastSyncedAt: z.iso.datetime().nullable(),
  platformRole: platformRoleSchema.nullable(),
  platformPermissions: z.array(permissionSchema),
  memberships: z.array(membershipSchema),
}).strict();

export type MeResponse = z.infer<typeof meResponseSchema>;
export type Permission = z.infer<typeof permissionSchema>;
export type PlatformRole = z.infer<typeof platformRoleSchema>;
export type MembershipRole = z.infer<typeof membershipRoleSchema>;
export type Membership = z.infer<typeof membershipSchema>;

export const apiErrorResponseSchema = z.object({
  error: z.string(),
});
