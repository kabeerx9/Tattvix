// Desk display text shared by the web and native hotel screens. Dates are en-IN.
import type { HotelStayListItem } from "@tattvix/contracts";

const dayFormat = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });
const timeFormat = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

/** "Today" / "today" for the current day, else "Sat 25 Oct". Takes an ISO date key. */
export function formatDay(key: string | null, todayKey: string, inline = false) {
  if (!key) return "—";
  if (key === todayKey) return inline ? "today" : "Today";
  return dayFormat.format(new Date(`${key}T12:00:00`));
}

export function formatTime(iso: string | null) {
  return iso ? timeFormat.format(new Date(iso)) : "—";
}

export function partyLabel(stay: Pick<HotelStayListItem, "companionCount">) {
  const people = stay.companionCount + 1;
  return `${people} ${people === 1 ? "guest" : "guests"}`;
}

/** One line under a guest's name on Today: who, which room, and when they leave. */
export function getReservationDetail(
  stay: Pick<HotelStayListItem, "operationalStatus" | "companionCount" | "expectedCheckOutDate" | "submittedAt" | "checkedOutAt">,
  roomNumber: string | null,
  todayKey: string,
): { text: string; overdue: boolean } {
  const place = roomNumber ? `Room ${roomNumber}` : null;
  if (stay.operationalStatus === "PENDING_CHECK_IN")
    return { text: `${partyLabel(stay)} · checked in on phone ${formatTime(stay.submittedAt)}`, overdue: false };
  if (stay.operationalStatus === "CHECKED_OUT")
    return { text: `${place ?? partyLabel(stay)} · left at ${formatTime(stay.checkedOutAt)}`, overdue: false };
  const due = stay.expectedCheckOutDate;
  if (!due) return { text: `${place ?? "No room yet"} · no checkout date`, overdue: false };
  const overdue = due < todayKey;
  return { text: `${place ?? "No room yet"} · ${overdue ? "overdue, due out" : "due out"} ${formatDay(due, todayKey, true)}`, overdue };
}
