import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    EXPO_PUBLIC_SERVER_URL: z.url(),
    // The web app's origin: the check-in QR encodes a web URL, since guests
    // scan it with whatever phone they hold.
    EXPO_PUBLIC_WEB_URL: z.url(),
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    // Sentry is off when unset (dev builds, tests).
    EXPO_PUBLIC_SENTRY_DSN: z.url().optional(),
  },
  // Expo inlines only direct `process.env.EXPO_PUBLIC_*` reads into release
  // bundles; passing the whole object leaves every value undefined there.
  runtimeEnv: {
    EXPO_PUBLIC_SERVER_URL: process.env.EXPO_PUBLIC_SERVER_URL,
    EXPO_PUBLIC_WEB_URL: process.env.EXPO_PUBLIC_WEB_URL,
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  },
  emptyStringAsUndefined: true,
});
