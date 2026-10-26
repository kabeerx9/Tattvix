import { z } from "zod";

const supportPhoneSchema = z.string()
  .regex(/^\+[1-9][0-9]{7,14}$/)
  .refine((phone) => phone !== "+910000000000");

export const supportContactsSchema = z.object({
  callPhone: supportPhoneSchema.nullable(),
  whatsappPhone: supportPhoneSchema.nullable(),
}).strict();

export type SupportContacts = z.infer<typeof supportContactsSchema>;
