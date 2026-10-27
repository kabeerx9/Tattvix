import type { GuestStay } from "@tattvix/contracts";

import { formatDateTime } from "./guest-format";

type AccessStay = Pick<GuestStay, "status" | "operationalStatus" | "hotelAccessExpiresAt">;

/** Shared guest access/revocation decision for both clients.
 * Operational checkout starts the expiry clock. Identity-review closure and
 * legacy submission deadlines cannot end an active stay. The server enforces
 * the same rule; revoked stays remain terminal.
 */
export type GuestAccessAction =
  | { kind: "hidden"; accessEndsBy: string | null }
  | { kind: "revocable"; accessEndsAt: string }
  | { kind: "ended"; reason: "revoked" | "expired"; endedAt: string | null }
  | { kind: "not-shared" };

export function getGuestAccessAction(stay: AccessStay, now: Date | number = Date.now()): GuestAccessAction {
  if (stay.status === "DRAFT") return { kind: "not-shared" };
  if (stay.status === "REVOKED") {
    return { kind: "ended", reason: "revoked", endedAt: stay.hotelAccessExpiresAt };
  }

  if (stay.operationalStatus !== "CHECKED_OUT") {
    return { kind: "hidden", accessEndsBy: null };
  }
  const nowMs = typeof now === "number" ? now : now.getTime();
  const expiresAt = stay.hotelAccessExpiresAt;
  if (!expiresAt || new Date(expiresAt).getTime() <= nowMs) {
    return { kind: "ended", reason: "expired", endedAt: expiresAt };
  }
  return { kind: "revocable", accessEndsAt: expiresAt };
}

/** True while the hotel can still open the guest's shared details. */
export function isHotelAccessOpen(action: GuestAccessAction) {
  return action.kind === "hidden" || action.kind === "revocable";
}

/** Legacy API policy is in hours; show whole days for the 60-day window. */
export function formatPostCheckoutWindow(hours = 60 * 24): string {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} ${days === 1 ? "day" : "days"}`;
  }
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export function describeGuestAccess(
  action: GuestAccessAction,
  options: { graceHours?: number; format?: (iso: string) => string } = {},
): string {
  const format = options.format ?? formatDateTime;
  switch (action.kind) {
    case "hidden":
      return `The hotel can see your details during your stay and for ${formatPostCheckoutWindow(options.graceHours)} after checkout. You can stop sharing after checkout.`;
    case "revocable":
      return `Hotel access ends ${format(action.accessEndsAt)}. You can stop sharing now.`;
    case "ended":
      if (action.reason === "revoked") {
        return action.endedAt ? `You stopped sharing on ${format(action.endedAt)}.` : "You stopped sharing.";
      }
      return action.endedAt ? `Access ended on ${format(action.endedAt)}.` : "Access has ended.";
    case "not-shared":
      return "Not shared with the hotel.";
  }
}
