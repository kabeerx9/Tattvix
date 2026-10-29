// Sentry for the native app. Imported once by app/_layout.tsx, which also
// wraps the root with `wrap`. Off without EXPO_PUBLIC_SENTRY_DSN, so dev
// builds and tests run without a project. Mirrors apps/web/src/lib/telemetry.ts.
//
// Release and dist are left to the SDK: it reads `com.tattwix.app@1.0.0+2`
// from the native build, which is the name the Gradle plugin uploads source
// maps under. Overriding them here would break symbolication. The default
// expo context integration tags `expo.updates.channel`, `update_id` and
// `runtime_version` on every event.
import * as Sentry from "@sentry/react-native";
import { UploadStepError } from "@tattvix/api";
import { env } from "@tattvix/env/native";
import * as Updates from "expo-updates";

import { scrubBreadcrumb, scrubEvent, shouldReportError, uploadFailureTags } from "./telemetry-privacy";

const apiOrigin = new URL(env.EXPO_PUBLIC_SERVER_URL).origin;
const reported = new WeakSet<object>();

// expo-router 58 moved the store expoRouterIntegration looks for, so the root
// layout registers its container ref here. Breadcrumbs carry route names
// (`check-in/[token]`), never the token itself.
const navigation = Sentry.reactNavigationIntegration();

export function registerNavigation(ref: unknown) {
  navigation.registerNavigationContainer(ref);
}

export const telemetryEnabled = Boolean(env.EXPO_PUBLIC_SENTRY_DSN);

Sentry.init({
  dsn: env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: telemetryEnabled,
  // EAS Update channel (preview, production); null in the dev client.
  environment: Updates.channel ?? "development",
  sendDefaultPii: false,
  // Guest screens show identity documents: never ship pixels or view trees.
  attachScreenshot: false,
  attachViewHierarchy: false,
  // Touch labels can echo a guest's name from a list row.
  enableUserInteractionTracing: false,
  enableCaptureFailedRequests: false,
  tracesSampleRate: __DEV__ ? 0 : 0.2,
  integrations: [navigation],
  beforeSend: (event, hint) => (shouldReportError(hint.originalException) ? scrubEvent(event, apiOrigin) : null),
  beforeSendTransaction: (event) => scrubEvent(event, apiOrigin),
  beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb, apiOrigin),
});

/** Internal numeric user id only — never the Clerk id, email or name. */
export function setTelemetryUser(userId: number | null) {
  Sentry.setUser(userId === null ? null : { id: String(userId) });
}

/**
 * Captures a failure once, however many layers see it (the upload pipeline
 * reports, then the mutation cache sees the same error). Expected 4xx and
 * connectivity loss are filtered in beforeSend too, but skipping them here
 * keeps them out of the SDK entirely.
 */
export function reportError(error: unknown, tags?: Record<string, string>) {
  if (!shouldReportError(error)) return;
  if (typeof error === "object" && error !== null) {
    if (reported.has(error)) return;
    // The upload pipeline already sent the failure this one wraps.
    const cause = (error as { cause?: unknown }).cause;
    if (typeof cause === "object" && cause !== null && reported.has(cause)) return;
    reported.add(error);
  }
  const allTags = error instanceof UploadStepError ? { ...uploadFailureTags(error), ...tags } : tags;
  Sentry.captureException(error, allTags ? { tags: allTags } : undefined);
}

/** Dev-only: proves the DSN, scrubbing and symbolication on a real device. */
export function sendTestError() {
  const error = new Error(`Tattwix test error from the app at ${new Date().toISOString()}`);
  Sentry.captureException(error, { tags: { test: "true" } });
  return error.message;
}

export const wrap = Sentry.wrap;
