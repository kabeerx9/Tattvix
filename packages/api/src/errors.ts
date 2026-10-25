import { ApiError } from "@tattvix/contracts";

/**
 * What the app should do about a failed request. One mapper for every
 * screen, so a 403 or an expired trial is handled the same way everywhere
 * (decision: "native data layer and error policy", issue #45).
 */
export type ApiFailure =
  /** 401: the token was rejected. Refresh once; a second 401 in a row means sign out. */
  | { kind: "unauthorized"; message: string }
  /** 403: access changed under us. Refetch `me` and let the route guards reroute. */
  | { kind: "forbidden"; message: string }
  /** 402: the hotel's subscription lapsed. Show the entitlement banner and disable writes. */
  | { kind: "entitlement"; message: string; code: string | null }
  /** 400 or 409: the server refused the change. Show the message and refresh what it was about. */
  | { kind: "rejected"; message: string; code: string | null; status: 400 | 409 }
  /** 404: the thing is gone. */
  | { kind: "missing"; message: string }
  /** No response at all: offline, DNS, timeout. Offer an inline retry. */
  | { kind: "network"; message: string }
  /** 5xx or anything else: not the user's fault. */
  | { kind: "server"; message: string; status: number | null };

export function classifyApiError(error: unknown): ApiFailure {
  if (error instanceof ApiError) {
    const message = error.message || "Something went wrong.";
    switch (error.status) {
      case 401:
        return { kind: "unauthorized", message };
      case 402:
        return { kind: "entitlement", message, code: error.code };
      case 403:
        return { kind: "forbidden", message };
      case 404:
        return { kind: "missing", message };
      case 400:
      case 409:
        return { kind: "rejected", message, code: error.code, status: error.status };
      default:
        return { kind: "server", message, status: error.status };
    }
  }
  if (error instanceof TypeError || (error instanceof Error && /network|fetch|abort/i.test(error.message))) {
    return { kind: "network", message: "Could not reach Tattwix. Check your connection and try again." };
  }
  return { kind: "server", message: error instanceof Error ? error.message : "Something went wrong.", status: null };
}

/** Queries retry only for failures where a retry can plausibly succeed. */
export function shouldRetryQuery(failureCount: number, error: unknown) {
  const failure = classifyApiError(error);
  if (failure.kind === "network" || failure.kind === "server") return failureCount < 2;
  return false;
}
