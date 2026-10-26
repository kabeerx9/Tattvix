import { z } from "zod";

export const propertyNameSchema = z.object({
  name: z.string().trim().min(1, "Enter a property name").max(255),
}).strict();
export type PropertyName = z.infer<typeof propertyNameSchema>;
