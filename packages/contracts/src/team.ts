import { z } from "zod";
import { membershipRoleSchema, propertyAccessSchema, organizationSummarySchema, subscriptionSchema } from "./me";

const idSchema = z.number().int().positive();
const propertyIdsSchema = z.array(idSchema).refine((ids) => new Set(ids).size === ids.length, "Select each property once");

export const teamUserSchema = z.object({
  id: idSchema, email: z.email(), firstName: z.string(), lastName: z.string(),
}).strict();
export const teamMemberSchema = z.object({
  id: idSchema, user: teamUserSchema, role: membershipRoleSchema,
  isActive: z.boolean(), hasAllProperties: z.boolean(), propertyIds: propertyIdsSchema,
}).strict();
export const teamListResponseSchema = z.object({
  organization: organizationSummarySchema,
  properties: z.array(propertyAccessSchema),
  subscription: subscriptionSchema,
  members: z.array(teamMemberSchema),
}).strict();
export const teamSearchInputSchema = z.object({ email: z.string().trim().toLowerCase().min(3).max(100) }).strict();
export const teamUserSearchResponseSchema = z.object({ users: z.array(teamUserSchema).max(10) }).strict();

function validScope(input: { role?: string; propertyIds?: number[] }) {
  if (input.role === "OWNER") return !input.propertyIds?.length;
  if (input.role) return !!input.propertyIds?.length;
  return input.propertyIds === undefined || input.propertyIds.length > 0;
}
export const teamAddInputSchema = z.object({
  userId: idSchema, role: membershipRoleSchema, propertyIds: propertyIdsSchema,
}).strict().refine(validScope, { message: "Choose properties for staff; owners have access to all properties", path: ["propertyIds"] });
export const teamUpdateInputSchema = z.object({
  role: membershipRoleSchema.optional(), propertyIds: propertyIdsSchema.optional(), isActive: z.boolean().optional(),
}).strict().refine((input) => Object.values(input).some((value) => value !== undefined), "Provide a change")
  .refine(validScope, { message: "Choose properties for staff; owners have access to all properties", path: ["propertyIds"] });

export type TeamUser = z.infer<typeof teamUserSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type TeamList = z.infer<typeof teamListResponseSchema>;
export type TeamAddInput = z.infer<typeof teamAddInputSchema>;
export type TeamUpdateInput = z.infer<typeof teamUpdateInputSchema>;
