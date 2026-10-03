import { z } from "zod";

// Pilot currency is INR. All monetary values are whole paise, never floats.
export const moneyMinorSchema = z.number().int().min(0).max(100_000_000);
export const stayBillChargeInputSchema = z
  .object({
    requestId: z.uuid(),
    description: z.string().trim().min(1).max(200),
    quantity: z.number().int().min(1).max(9999),
    unitPriceMinor: moneyMinorSchema,
  })
  .strict();
export const stayBillVoidInputSchema = z
  .object({ reason: z.string().trim().min(1).max(500) })
  .strict();
export const stayBillSchema = z.object({
  currency: z.literal("INR"),
  isFinal: z.boolean(),
  roomNights: z.number().int().min(1).max(365).nullable(),
  nightlyRateMinor: moneyMinorSchema.nullable(),
  items: z.array(
    z.object({
      id: z.uuid(),
      kind: z.enum(["ROOM", "EXTRA"]),
      description: z.string(),
      quantity: z.number().int().min(1).max(9999),
      unitPriceMinor: moneyMinorSchema,
      lineTotalMinor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
      createdAt: z.iso.datetime({ offset: true }),
      voidedAt: z.iso.datetime({ offset: true }).nullable(),
      voidReason: z.string(),
    }),
  ),
  totalMinor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});
const timeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$|^$/, "Use HH:mm or leave blank");
const phoneSchema = z
  .string()
  .trim()
  .max(32)
  .refine(
    (value) =>
      !value ||
      (/^\+?[0-9\s-]+$/.test(value) &&
        (value.match(/[0-9]/g)?.length ?? 0) >= 7 &&
        (value.match(/[0-9]/g)?.length ?? 0) <= 20),
    "Enter a valid contact phone",
  );
export const propertyDetailsInputSchema = z
  .object({
    address: z.string().trim().max(1000),
    contactPhone: phoneSchema,
    description: z.string().trim().max(2000),
    amenities: z.array(z.string().trim().min(1).max(80)).max(30),
    checkInTime: timeSchema,
    checkOutTime: timeSchema,
  })
  .strict();
export const propertyDetailsSchema = propertyDetailsInputSchema.extend({
  currency: z.literal("INR"),
  nightlyRateFromMinor: moneyMinorSchema.nullable(),
  nightlyRateToMinor: moneyMinorSchema.nullable(),
});
export type StayBill = z.infer<typeof stayBillSchema>;
export type StayBillChargeInput = z.infer<typeof stayBillChargeInputSchema>;
export type StayBillVoidInput = z.infer<typeof stayBillVoidInputSchema>;
export type PropertyDetails = z.infer<typeof propertyDetailsSchema>;
export type PropertyDetailsInput = z.infer<typeof propertyDetailsInputSchema>;
