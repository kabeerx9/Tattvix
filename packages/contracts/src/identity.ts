import { z } from "zod";

export const draftTextSchema = (maximum: number) =>
  z.string().trim().max(maximum).default("");

export const countryCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(
    z.union([
      z.literal(""),
      z.string().regex(/^[A-Z]{2}$/, "Use a two-letter country code"),
    ]),
  );

export const pastDateSchema = z
  .iso.date()
  .nullable()
  .refine(
    (value) => value === null || value < new Date().toISOString().slice(0, 10),
    "Date of birth must be in the past",
  );
