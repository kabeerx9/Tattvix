import { z } from "zod";

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
}).strict();

export type MeResponse = z.infer<typeof meResponseSchema>;

export const apiErrorResponseSchema = z.object({
  error: z.string(),
});
