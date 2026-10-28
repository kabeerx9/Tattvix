import type { HotelStayDetail } from "@tattvix/contracts";

import { formatPostCheckoutWindow } from "./guest-access";

type IdentityAccessStay = Pick<HotelStayDetail, "operationalStatus" | "identityAccess">;

const formatDay = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

/**
 * The one line staff see about how long they can open a guest's ID. Access
 * runs through the stay and ends a fixed window after checkout, so before
 * checkout any stored expiry is a legacy deadline and is ignored (same rule
 * as `getGuestAccessAction`). Null when access is no longer active.
 */
export function describeHotelIdentityAccess(
  stay: IdentityAccessStay,
  options: { graceHours?: number; format?: (iso: string) => string } = {},
): string | null {
  if (!stay.identityAccess.isActive) return null;
  const format = options.format ?? formatDay;
  if (stay.operationalStatus === "CHECKED_OUT" && stay.identityAccess.expiresAt) {
    return `ID access ends ${format(stay.identityAccess.expiresAt)}`;
  }
  return `ID access ends ${formatPostCheckoutWindow(options.graceHours)} after checkout`;
}
