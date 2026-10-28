import { z } from "zod";
export const referralCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-HJ-NP-Z2-9]{12}$/, "Enter a valid referral code.");
export const optionalReferralCodeSchema = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .pipe(referralCodeSchema.optional())
  .optional();
export const referralCreatedSchema = z
  .object({ code: referralCodeSchema })
  .strict();
export const referralDashboardSchema = z
  .object({
    code: referralCodeSchema.nullable(),
    summary: z
      .object({
        total: z.number().int().nonnegative(),
        pending: z.number().int().nonnegative(),
        approved: z.number().int().nonnegative(),
        rejected: z.number().int().nonnegative(),
      })
      .strict(),
    registrations: z
      .array(
        z
          .object({
            id: z.number().int().positive(),
            hotelName: z.string(),
            status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
            submittedAt: z.iso.datetime({ offset: true }),
            reviewedAt: z.iso.datetime({ offset: true }).nullable(),
          })
          .strict(),
      )
      .max(25),
    nextCursor: z.number().int().positive().nullable(),
  })
  .strict();
export type ReferralDashboard = z.infer<typeof referralDashboardSchema>;
