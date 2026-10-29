// Pure scrubbing rules for what the native app sends to Sentry. No React
// Native imports, so node:test can exercise it. Mirrors the "no PII" contract
// of apps/web/src/lib/telemetry-privacy.ts and apps/server/tattvix/monitoring.py:
// identity documents, names, emails, check-in tokens and bearer tokens must
// never reach Sentry; users are identified by their internal numeric id only.
import { UploadStepError, classifyApiError } from "@tattvix/api";
import { ApiError } from "@tattvix/contracts";

// Check-in tokens are bearer secrets: anyone holding one can open that
// hotel's consent flow.
const CHECK_IN_PATH = /(\/check-in\/)[^/?#\s"']+/g;
// token_urlsafe(32) on the server is always 43 URL-safe characters.
const BARE_TOKEN = /(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])/g;
const BEARER = /\b(Bearer)\s+[A-Za-z0-9._~+/-]+=*/gi;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
// Object keys whose values are never worth keeping, whatever they hold.
const SENSITIVE_KEY = /authorization|cookie|token|secret|password|email|x-amz/i;

export function redactSecrets(value: string): string {
  return value
    .replace(CHECK_IN_PATH, "$1[token]")
    .replace(BEARER, "$1 [token]")
    .replace(BARE_TOKEN, "[token]")
    .replace(EMAIL, "[email]");
}

/**
 * A URL safe to keep on a breadcrumb or request: no query string or fragment
 * (signed uploads carry their signature there), the check-in token replaced,
 * and for any host other than our API only the origin, since a storage URL's
 * path is the object key of someone's identity document.
 */
export function scrubUrl(href: string, apiOrigin?: string): string {
  if (!href) return "";
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return redactSecrets(href.split(/[?#]/)[0] ?? "");
  }
  if (apiOrigin && url.origin !== apiOrigin) return `${url.origin}/[path]`;
  return `${url.origin}${url.pathname.replace(CHECK_IN_PATH, "$1[token]")}`;
}

function redactDeep(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return redactSecrets(value);
  if (depth > 12) return value;
  if (Array.isArray(value)) return value.map((item) => redactDeep(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? "[redacted]" : redactDeep(item, depth + 1)]),
    );
  }
  return value;
}

// Structural shapes wide enough for Sentry's own Breadcrumb / Event types.
type Breadcrumb = { category?: string; type?: string; message?: string; data?: Record<string, unknown> };

/**
 * Console lines are dropped (they echo API payloads). Network breadcrumbs keep
 * only method, scrubbed URL and status; everything else is redacted deeply.
 */
export function scrubBreadcrumb<T extends Breadcrumb>(breadcrumb: T, apiOrigin?: string): T | null {
  if (breadcrumb.category === "console") return null;
  if (breadcrumb.type === "http" || breadcrumb.category === "fetch" || breadcrumb.category === "xhr") {
    const data = breadcrumb.data ?? {};
    const kept: Record<string, unknown> = {};
    if (typeof data.method === "string") kept.method = data.method;
    if (typeof data.url === "string") kept.url = scrubUrl(data.url, apiOrigin);
    if (typeof data.status_code === "number") kept.status_code = data.status_code;
    return { ...breadcrumb, message: undefined, data: kept };
  }
  return redactDeep(breadcrumb) as T;
}

type SentryEventLike = {
  request?: { url?: string };
  user?: { id?: unknown };
  breadcrumbs?: Breadcrumb[];
  exception?: { values?: Array<{ stacktrace?: { frames?: Array<{ vars?: unknown }> } }> };
};

export function scrubEvent<T extends SentryEventLike>(event: T, apiOrigin?: string): T {
  if (event.request) {
    const { query_string: _query, headers: _headers, cookies: _cookies, data: _data, url, ...request } = event.request as Record<string, unknown>;
    event.request = typeof url === "string" ? { ...request, url: scrubUrl(url, apiOrigin) } : request;
  }
  if (event.user) event.user = typeof event.user.id === "string" ? { id: event.user.id } : {};
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => scrubBreadcrumb(crumb, apiOrigin)).filter((crumb): crumb is Breadcrumb => crumb !== null);
  }
  for (const value of event.exception?.values ?? []) {
    for (const frame of value.stacktrace?.frames ?? []) delete frame.vars;
  }
  return redactDeep(event) as T;
}

/**
 * Which failures are bugs worth a Sentry event. Expected API answers (4xx:
 * validation, 401, 403, 404, a lapsed subscription) and plain connectivity
 * loss are not; 5xx, storage refusals and anything unexpected are.
 */
export function shouldReportError(error: unknown): boolean {
  if (error instanceof UploadStepError) {
    if (error.timedOut) return false;
    const cause = error.cause;
    // Our API already said what was wrong with the photo (step !== "send");
    // storage's 4xx (SignatureDoesNotMatch, AccessDenied) means our signing is broken.
    if (cause instanceof ApiError && cause.status < 500 && error.step !== "send") return false;
    if (!(cause instanceof ApiError) && classifyApiError(cause).kind === "network") return false;
    return true;
  }
  if (error instanceof ApiError) return error.status >= 500;
  // A wrapper (IdentityDocumentSaveError) is judged by the failure it wraps.
  if (error instanceof Error && error.cause !== undefined) return shouldReportError(error.cause);
  return classifyApiError(error).kind !== "network";
}

/** Tags for an upload failure: step, status and storage code only — never a URL or object key. */
export function uploadFailureTags(error: UploadStepError): Record<string, string> {
  const tags: Record<string, string> = { upload_step: error.step, upload_timed_out: String(error.timedOut) };
  if (error.status !== null) tags.upload_status = String(error.status);
  if (error.cause instanceof ApiError && error.cause.code) tags.upload_code = error.cause.code;
  return tags;
}
