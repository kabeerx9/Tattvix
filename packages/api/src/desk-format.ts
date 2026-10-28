// Desk display text shared by the web and native hotel screens. Dates are en-IN.
import type { HotelStayListItem } from "@tattvix/contracts";

import { localDayKey } from "./hotel-metrics";

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

export type StayKeyCard = {
  status: { label: string; tone: "success" | "warning" | "danger" | "muted" };
  checkout: { label: string; when: string; countdown: { lead: string; value: string } | null; overdue: boolean };
};

const dayCount = (days: number) => `${days} ${days === 1 ? "day" : "days"}`;

/** The stay detail's key card: the stay's state, and checkout with a countdown. */
export function getStayKeyCard(
  stay: Pick<HotelStayListItem, "operationalStatus" | "expectedCheckOutDate" | "checkedOutAt">,
  todayKey: string,
): StayKeyCard {
  if (stay.operationalStatus === "PENDING_CHECK_IN")
    return {
      status: { label: "Waiting for a room", tone: "warning" },
      checkout: { label: "Check-out", when: stay.expectedCheckOutDate ? formatDay(stay.expectedCheckOutDate, todayKey) : "Set when a room is assigned", countdown: null, overdue: false },
    };
  if (stay.operationalStatus === "CHECKED_OUT") {
    const left = stay.checkedOutAt ? `${formatDay(localDayKey(new Date(stay.checkedOutAt)), todayKey)}, ${formatTime(stay.checkedOutAt)}` : "—";
    return { status: { label: "Checked out", tone: "muted" }, checkout: { label: "Checked out", when: left, countdown: null, overdue: false } };
  }
  const due = stay.expectedCheckOutDate;
  if (!due) return { status: { label: "In house", tone: "success" }, checkout: { label: "Check-out", when: "No date set", countdown: null, overdue: false } };
  // Both are calendar-day keys, so parse them at the same UTC instant to count whole days.
  const days = Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) / 86_400_000);
  const when = formatDay(due, todayKey);
  if (days < 0)
    return {
      status: { label: "Checkout overdue", tone: "danger" },
      checkout: { label: "Check-out was", when, countdown: { lead: "overdue by", value: dayCount(-days) }, overdue: true },
    };
  if (days === 0) return { status: { label: "Checking out today", tone: "warning" }, checkout: { label: "Check-out", when, countdown: null, overdue: false } };
  return { status: { label: "In house", tone: "success" }, checkout: { label: "Check-out", when, countdown: { lead: "in", value: dayCount(days) }, overdue: false } };
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
