// Display formatting shared by the desk screens. Dates are en-IN like the web.
import type { HotelRoom, HotelStayListItem } from "@tattvix/contracts";
import type { ApiError } from "@tattvix/contracts";

const dayFormat = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });
const timeFormat = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });
const longDateFormat = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });
const mediumDateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const formatLongDate = (value: Date) => longDateFormat.format(value);

/** "Today" / "today" for the current day, else "Sat 25 Oct". Takes an ISO date key. */
export function formatDay(key: string | null, todayKey: string, inline = false) {
  if (!key) return "—";
  if (key === todayKey) return inline ? "today" : "Today";
  return dayFormat.format(new Date(`${key}T12:00:00`));
}

export const formatTime = (iso: string | null) => (iso ? timeFormat.format(new Date(iso)) : "—");
export const formatDate = (key: string | null) => (key ? mediumDateFormat.format(new Date(`${key}T12:00:00`)) : "—");
export const formatDateTime = (iso: string | null) => (iso ? dateTimeFormat.format(new Date(iso)) : "—");

export function partyLabel(stay: Pick<HotelStayListItem, "companionCount">) {
  const people = stay.companionCount + 1;
  return `${people} ${people === 1 ? "guest" : "guests"}`;
}

/** Up to two initials from a display name. */
export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

export const roomStatusLabel: Record<HotelRoom["status"], string> = {
  VACANT: "Ready",
  OCCUPIED: "Occupied",
  CLEANING: "Cleaning",
  MAINTENANCE: "Maintenance",
};

export const roomStatusTone: Record<HotelRoom["status"], "success" | "neutral" | "warning" | "destructive"> = {
  VACANT: "success",
  OCCUPIED: "neutral",
  CLEANING: "warning",
  MAINTENANCE: "destructive",
};

export function roomMeta(room: Pick<HotelRoom, "roomType" | "floor">) {
  return [room.roomType, room.floor ? `Floor ${room.floor}` : null].filter(Boolean).join(" · ");
}

export function documentTypeLabel(value: string) {
  return (
    ({ AADHAAR: "Aadhaar card", PASSPORT: "Passport", DRIVING_LICENCE: "Driving licence", VOTER_ID: "Voter ID" } as Record<string, string>)[value] ?? value
  );
}

/** The server's message for an ApiError, a fallback for anything else, null for no error. */
export function errorMessage(error: unknown, fallback: string) {
  if (!error) return null;
  if (typeof error === "object" && "message" in error && (error as ApiError).name === "ApiError") return String((error as ApiError).message);
  return fallback;
}
