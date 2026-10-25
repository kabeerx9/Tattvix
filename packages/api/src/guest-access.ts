import type { GuestStay } from "@tattvix/contracts";

import { formatDateTime } from "./guest-format";

type AccessStay = Pick<GuestStay, "status" | "operationalStatus" | "hotelAccessExpiresAt">;

/**
 * What the guest can do about a hotel's access to their shared details.
 *
 * - `hidden`: the stay is active (sent, waiting for a room, checked in). The
 *   hotel needs the details while the guest is in house, so the guest sees an
 *   explanation instead of a stop-sharing action. `accessEndsBy` is the
 *   maximum-days cap the server set at submission.
 * - `revocable`: the hotel checked the guest out (or finished its identity
 *   review) and its access window is still open until `accessEndsAt`.
 * - `ended`: access is over, because the guest stopped sharing or the window
 *   closed. `endedAt` is when it ended, when the server recorded it.
 * - `not-shared`: a draft that was never sent to the hotel.
 *
 * Every guest surface renders from this one decision so they cannot drift.
 * The server still accepts revocation at any time; this is a UI rule.
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

  const nowMs = typeof now === "number" ? now : now.getTime();
  const expiresAt = stay.hotelAccessExpiresAt;
  if (!expiresAt || new Date(expiresAt).getTime() <= nowMs) {
    return { kind: "ended", reason: "expired", endedAt: expiresAt };
  }

  // Checkout moves status to CLOSED and shortens access to checkout + grace.
  // A hotel can also close its identity review before checkout; either way the
  // window is now counting down, so the guest may end it early.
  if (stay.operationalStatus === "CHECKED_OUT" || stay.status === "CLOSED") {
    return { kind: "revocable", accessEndsAt: expiresAt };
  }
  return { kind: "hidden", accessEndsBy: expiresAt };
}

/** True while the hotel can still open the guest's shared details. */
export function isHotelAccessOpen(action: GuestAccessAction) {
  return action.kind === "hidden" || action.kind === "revocable";
}

/**
 * One line describing the access state. `graceHours` is the post-checkout
 * window from the check-in access policy; surfaces whose payload does not
 * carry the policy omit it and the copy falls back to the cap date.
 */
export function describeGuestAccess(
  action: GuestAccessAction,
  options: { graceHours?: number; format?: (iso: string) => string } = {},
): string {
  const format = options.format ?? formatDateTime;
  switch (action.kind) {
    case "hidden": {
      const ends = options.graceHours
        ? `access ends automatically ${options.graceHours} ${options.graceHours === 1 ? "hour" : "hours"} after checkout.`
        : action.accessEndsBy
          ? `access ends automatically after checkout, and no later than ${format(action.accessEndsBy)}.`
          : "access ends automatically after checkout.";
      return `The hotel can see your details during your stay. You can stop sharing after checkout; ${ends}`;
    }
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
