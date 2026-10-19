import { ApiError } from "@tattvix/contracts";

// Check-in tokens are bearer secrets: anyone holding one can open that
// hotel's consent flow. They must never reach Sentry or Google Analytics.
const CHECK_IN_PATH = /(\/check-in\/)[^/?#\s"']+/g;
// token_urlsafe(32) on the server is always 43 URL-safe characters.
const BARE_TOKEN = /(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])/g;

export function redactTokens(value: string): string {
  return value
    .replace(CHECK_IN_PATH, "$1[token]")
    .replace(BARE_TOKEN, "[token]");
}

/** Origin + path only, with the check-in token replaced by `:token`. */
export function sanitizeUrl(href: string): string {
  if (!href) return "";
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return "";
  }
  const path = url.pathname.replace(CHECK_IN_PATH, "$1:token");
  return `${url.origin}${path}`;
}

function redactDeep(value: unknown): unknown {
  if (typeof value === "string") return redactTokens(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactDeep(item)]),
    );
  }
  return value;
}

export function scrubSentryEvent<T extends { request?: object }>(event: T): T {
  if (event.request) {
    const { query_string, headers, cookies, data, ...request } =
      event.request as Record<string, unknown>;
    event.request = request;
  }
  return redactDeep(event) as T;
}

/** Expected 4xx API responses (invalid QR, forbidden) are not bugs. */
export function shouldReportError(error: unknown): boolean {
  return !(error instanceof ApiError && error.status < 500);
}
