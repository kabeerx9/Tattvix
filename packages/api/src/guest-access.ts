import type { GuestShare, GuestStay, IdentityAccessAction } from "@tattvix/contracts";

import { formatDateTime } from "./guest-format";

type AccessStay = Pick<GuestStay, "status" | "operationalStatus" | "hotelAccessExpiresAt">;

/** Shared guest access/revocation decision for both clients.
 * `hotelAccessExpiresAt` is the server's current deadline: checkout plus the
 * window once checked out, otherwise the safety cap for a stay the hotel never
 * closes (planned checkout plus the window, or submission plus the window if
 * the guest never arrived). A stay can only be revoked after checkout; a
 * lapsed open stay simply ends. Revoked stays remain terminal.
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
  const lapsed = !!expiresAt && new Date(expiresAt).getTime() <= nowMs;
  if (stay.operationalStatus !== "CHECKED_OUT") {
    if (lapsed) return { kind: "ended", reason: "expired", endedAt: expiresAt };
    return { kind: "hidden", accessEndsBy: expiresAt };
  }
  if (!expiresAt || lapsed) {
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

/** The consent screen's "For how long" paragraph, rendered from the live policy so both apps match the server. */
export function describeConsentAccessWindow(graceHours?: number): string {
  const window = formatPostCheckoutWindow(graceHours);
  return (
    `Access stays active throughout your stay and ends ${window} after checkout. ` +
    `If the hotel never checks you out, it ends ${window} after your planned checkout instead, ` +
    `or ${window} after you shared if you never arrive. ` +
    `The ID photos shared with the hotel are then scheduled for deletion.`
  );
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

const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const formatShortDate = (iso: string) => shortDate.format(new Date(iso));

/** One short line for a privacy row: is the hotel still able to see the ID, and until when. */
export function getGuestAccessSummary(action: GuestAccessAction, format: (iso: string) => string = formatShortDate): { open: boolean; text: string } {
  switch (action.kind) {
    case "hidden":
      return { open: true, text: "Sharing while you stay" };
    case "revocable":
      return { open: true, text: `Sharing until ${format(action.accessEndsAt)}` };
    case "ended":
      // No date: for a revoked stay endedAt is the stored expiry, not the moment sharing stopped.
      if (action.reason === "revoked") return { open: false, text: "You stopped sharing" };
      return { open: false, text: action.endedAt ? `Sharing ended ${format(action.endedAt)}` : "Sharing ended" };
    case "not-shared":
      return { open: false, text: "Not shared" };
  }
}

type AccessEvent = GuestShare["accessEvents"][number];

export type AccessEventGroup = {
  action: IdentityAccessAction;
  imageSide: "FRONT" | "BACK" | null;
  companionName: string | null;
  count: number;
  lastAt: string;
};

// Collapse repeat views per record: a review session opens details plus each
// image, and refetches audit again. The guest wants "how often was each record
// opened", not every issuance row.
export function groupAccessEvents(events: AccessEvent[]): AccessEventGroup[] {
  const groups = new Map<string, AccessEventGroup>();
  for (const event of events) {
    const key = `${event.action}:${event.imageSide ?? ""}:${event.companionId ?? 0}`;
    const current = groups.get(key);
    if (current) {
      current.count += 1;
      if (new Date(event.createdAt).getTime() > new Date(current.lastAt).getTime()) current.lastAt = event.createdAt;
    } else {
      groups.set(key, {
        action: event.action,
        imageSide: event.imageSide,
        companionName: event.companionId ? event.companionName || "Companion" : null,
        count: 1,
        lastAt: event.createdAt,
      });
    }
  }
  return [...groups.values()];
}

/** What the hotel did, in the guest's words: "Opened the back of your ID". */
export function accessActivityLabel(group: Pick<AccessEventGroup, "action" | "imageSide" | "companionName">) {
  const whose = group.companionName ? `${group.companionName}'s` : "your";
  if (group.action === "DOCUMENT_VIEWED") return `Opened the ${group.imageSide === "BACK" ? "back" : "front"} of ${whose} ID`;
  if (group.action === "DETAILS_VIEWED") return `Opened ${whose} ID details`;
  if (group.action === "STAY_CLOSED") return "Finished checking your ID";
  return "You stopped sharing";
}

/** The line in the Privacy band. */
export function getPrivacyHeadline(openCount: number) {
  if (openCount === 0) return "No hotel can see your ID";
  return `${openCount} ${openCount === 1 ? "hotel" : "hotels"} can see your ID right now`;
}
