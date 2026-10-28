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

/** The line over Today's list: the most pressing count first, the rest beneath it. */
export function getTodayHeadline({ waiting, checkingOut, checkedIn }: { waiting: number; checkingOut: number; checkedIn: number }) {
  const rest = (parts: (string | null)[], empty: string) => parts.filter(Boolean).join(" · ") || empty;
  if (waiting)
    return {
      title: `${waiting} ${waiting === 1 ? "guest needs" : "guests need"} a room`,
      detail: rest([checkingOut ? `${checkingOut} checking out` : null, checkedIn ? `${checkedIn} checked in` : null], "No one else at the desk yet"),
    };
  if (checkingOut) return { title: `${checkingOut} checking out today`, detail: rest([checkedIn ? `${checkedIn} checked in` : null], "No one else is staying") };
  if (checkedIn) return { title: `${checkedIn} checked in`, detail: "No arrivals or checkouts waiting" };
  return { title: "All quiet at the desk", detail: "New check-ins appear here as guests scan your QR" };
}
