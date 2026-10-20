import * as Sentry from "@sentry/react";
import { env } from "@tattvix/env/web";

import {
  sanitizeUrl,
  scrubSentryEvent,
  shouldReportError,
} from "./telemetry-privacy";

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

let previousPage = "";
let lastTrackedHref = "";

export function initTelemetry() {
  if (env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: env.VITE_SENTRY_DSN,
      environment: __APP_ENVIRONMENT__,
      release: __APP_RELEASE__,
      sendDefaultPii: false,
      // No session replay: guest screens show identity documents.
      beforeSend: (event, hint) =>
        shouldReportError(hint.originalException)
          ? scrubSentryEvent(event)
          : null,
      beforeSendTransaction: (event) => scrubSentryEvent(event),
      beforeBreadcrumb: (breadcrumb) =>
        // Console output can echo API payloads.
        breadcrumb.category === "console" ? null : breadcrumb,
    });
  }

  const measurementId = env.VITE_GA_MEASUREMENT_ID;
  if (measurementId) {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function gtag() {
      // gtag.js expects the `arguments` object itself, not an array.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    previousPage = sanitizeUrl(document.referrer);
    // Pin the sanitized location before anything is sent: enhanced
    // measurement events (scrolls, outbound clicks) read it too, and the
    // raw URL can carry a check-in token.
    window.gtag("set", {
      page_location: sanitizeUrl(window.location.href),
      page_referrer: previousPage,
    });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { send_page_view: false });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
  }
}

export function trackPageView(href: string) {
  // The router resolves more than once for one navigation (initial load,
  // loader retries); count each URL change once.
  if (!window.gtag || href === lastTrackedHref) return;
  lastTrackedHref = href;
  const page = sanitizeUrl(href);
  window.gtag("set", { page_location: page, page_referrer: previousPage });
  window.gtag("event", "page_view", {
    page_location: page,
    page_referrer: previousPage,
  });
  previousPage = page;
}

/**
 * Product events. Params must never carry names, document data, emails or
 * tokens: slugs, statuses, counts and durations only.
 */
export function trackEvent(
  name: string,
  params: Record<string, string | number | boolean> = {},
) {
  window.gtag?.("event", name, params);
}

/** Clerk user id only — opaque, no email or name. */
export function setTelemetryUser(userId: string | null) {
  Sentry.setUser(userId ? { id: userId } : null);
}

export function reportError(error: unknown) {
  if (shouldReportError(error)) Sentry.captureException(error);
}

export const reactErrorHandler = Sentry.reactErrorHandler;
