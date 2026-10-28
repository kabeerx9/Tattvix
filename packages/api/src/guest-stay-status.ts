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
  const facts: ProfileFact[] = [{ label: "Room", value: stay.room ? `Room ${stay.room.number}` : "Reception will assign one", icon: "room" }];
  if (stay.checkedInAt) facts.push({ label: "Checked in", value: format(stay.checkedInAt), icon: "checkedIn" });
  else if (stay.submittedAt) facts.push({ label: "Requested", value: format(stay.submittedAt), icon: "requested" });
  if (stay.checkedOutAt) facts.push({ label: "Checked out", value: format(stay.checkedOutAt), icon: "checkedOut" });
  if (bill?.roomNights != null) {
    const nights = `${bill.roomNights} ${bill.roomNights === 1 ? "night" : "nights"}`;
    facts.push({ label: "Nights", value: bill.nightlyRateMinor != null ? `${nights} at ${formatMoneyMinor(bill.nightlyRateMinor)} a night` : nights, icon: "nights" });
  }
  return facts;
}

export type GuestKeyCard = {
  hotel: string;
  status: string;
  tone: "success" | "warning" | "muted";
  room: string | null;
  since: { label: "Checked in" | "Requested"; when: string } | null;
  /** "11:00 am", or null when the hotel hasn't set it. */
  checkOut: string | null;
  checkIn: string | null;
  address: string | null;
  phone: string | null;
  /** How often reception has opened the guest's ID, in a sentence. */
  idViews: string;
};

const clockFormat = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

/** "11:00" → "11:00 am"; blank → null. */
function formatClock(value: string | undefined) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return clockFormat.format(new Date(2000, 0, 1, hours, minutes));
}

/** The text on the guest's flippable stay key card: the stay on the front, the hotel and ID access on the back. */
export function getGuestKeyCard(
  stay: Pick<GuestShare, "operationalStatus" | "property" | "room" | "submittedAt" | "checkedInAt" | "accessEvents">,
  format: (iso: string) => string = formatDateTime,
): GuestKeyCard {
  const details = stay.property.details;
  const since = stay.checkedInAt
    ? { label: "Checked in" as const, when: format(stay.checkedInAt) }
    : stay.submittedAt
      ? { label: "Requested" as const, when: format(stay.submittedAt) }
      : null;
  const views = stay.accessEvents.filter((event) => event.action === "DETAILS_VIEWED" || event.action === "DOCUMENT_VIEWED");
  const last = views.reduce<string | null>((latest, event) => (!latest || event.createdAt > latest ? event.createdAt : latest), null);
  const times = views.length === 1 ? "once" : `${views.length} times`;
  return {
    hotel: stay.property.name,
    status: stayStatusLabel(stay.operationalStatus),
    tone: stay.operationalStatus === "CHECKED_IN" ? "success" : stay.operationalStatus === "PENDING_CHECK_IN" ? "warning" : "muted",
    room: stay.room?.number ?? null,
    since,
    checkOut: formatClock(details?.checkOutTime),
    checkIn: formatClock(details?.checkInTime),
    address: details?.address.trim() || null,
    phone: details?.contactPhone.trim() || null,
    idViews: last ? `Reception opened your ID ${times}, last ${format(last)}` : "Reception hasn't opened your ID yet",
  };
}
