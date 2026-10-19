import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SERVER_URL: z.url(),
    VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    // Optional: unset disables error reporting / analytics (local dev).
    VITE_SENTRY_DSN: z.url().optional(),
    VITE_GA_MEASUREMENT_ID: z.string().regex(/^G-[A-Z0-9]+$/).optional(),
  },
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
});
