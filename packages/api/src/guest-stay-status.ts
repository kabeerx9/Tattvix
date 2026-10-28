import type { GuestShare, GuestStay, OperationalStayStatus, StayBill } from "@tattvix/contracts";

import { formatDateTime } from "./guest-format";
import type { ProfileFact } from "./guest-profile-view";
import { formatMoneyMinor } from "./money";

/** The one name for each stay status, shown to guests and staff alike. */
export function stayStatusLabel(status: OperationalStayStatus): string {
  return {
    PENDING_CHECK_IN: "Waiting for a room",
    CHECKED_IN: "Checked in",
    CHECKED_OUT: "Checked out",
  }[status];
}

/** The stay to show on a guest's Home: checked in first, else a request still waiting for a room. */
export function getCurrentGuestStay<T extends Pick<GuestShare, "operationalStatus" | "status">>(stays: T[]): T | null {
  return (
    stays.find((stay) => stay.operationalStatus === "CHECKED_IN") ??
    stays.find((stay) => stay.operationalStatus === "PENDING_CHECK_IN" && stay.status === "SUBMITTED") ??
    null
  );
}

/** The facts on a guest's stay page: the room, the moments that happened, and nights at the rate. */
export function getGuestStayFacts(
  stay: Pick<GuestStay, "room" | "submittedAt" | "checkedInAt" | "checkedOutAt">,
  bill: Pick<StayBill, "roomNights" | "nightlyRateMinor"> | null | undefined,
  format: (iso: string) => string = formatDateTime,
): ProfileFact[] {
  const facts: ProfileFact[] = [{ label: "Room", value: stay.room ? `Room ${stay.room.number}` : "Reception will assign one" }];
  if (stay.checkedInAt) facts.push({ label: "Checked in", value: format(stay.checkedInAt) });
  else if (stay.submittedAt) facts.push({ label: "Requested", value: format(stay.submittedAt) });
  if (stay.checkedOutAt) facts.push({ label: "Checked out", value: format(stay.checkedOutAt) });
  if (bill?.roomNights != null) {
    const nights = `${bill.roomNights} ${bill.roomNights === 1 ? "night" : "nights"}`;
    facts.push({ label: "Nights", value: bill.nightlyRateMinor != null ? `${nights} at ${formatMoneyMinor(bill.nightlyRateMinor)} a night` : nights });
  }
  return facts;
}
