import { z } from "zod";

export const hotelRegistrationStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const hotelRegistrationInputSchema = z.object({
  hotelName: requiredText(255),
  address: requiredText(1000),
  contactPhone: requiredText(32).regex(/^\+?[0-9\s-]+$/, "Enter a valid contact phone number.").refine(
    (phone) => { const digits = phone.replace(/[^0-9]/g, "").length; return digits >= 7 && digits <= 20; },
    "Enter a phone number with 7 to 20 digits.",
  ),
}).strict();

export const hotelRegistrationReviewInputSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().trim().max(1000).optional(),
}).strict().refine((input) => input.decision !== "REJECT" || Boolean(input.rejectionReason), {
  path: ["rejectionReason"], message: "Explain why this request was rejected.",
});

const hotelSummarySchema = z.object({ name: z.string(), slug: z.string() }).strict();
export const hotelRegistrationRequestSchema = hotelRegistrationInputSchema.extend({
  id: z.number().int().positive(),
  status: hotelRegistrationStatusSchema,
  rejectionReason: z.string(),
  submittedAt: z.iso.datetime({ offset: true }),
  reviewedAt: z.iso.datetime({ offset: true }).nullable(),
  organization: hotelSummarySchema.nullable(),
  property: hotelSummarySchema.nullable(),
}).strict();

export const hotelRegistrationListResponseSchema = z.object({
  requests: z.array(hotelRegistrationRequestSchema),
}).strict();

export const platformHotelRegistrationRequestSchema = hotelRegistrationRequestSchema.extend({
  applicant: z.object({ id: z.number().int().positive(), email: z.string(), firstName: z.string(), lastName: z.string() }).strict(),
}).strict();

export const platformHotelRegistrationListResponseSchema = z.object({
  requests: z.array(platformHotelRegistrationRequestSchema),
}).strict();

export type HotelRegistrationInput = z.infer<typeof hotelRegistrationInputSchema>;
export type HotelRegistrationReviewInput = z.infer<typeof hotelRegistrationReviewInputSchema>;
export type HotelRegistrationRequest = z.infer<typeof hotelRegistrationRequestSchema>;
export type HotelRegistrationStatus = z.infer<typeof hotelRegistrationStatusSchema>;
export type PlatformHotelRegistrationRequest = z.infer<typeof platformHotelRegistrationRequestSchema>;
