// Display formatting shared by the desk screens. Dates are en-IN like the web.
import type { HotelRoom } from "@tattvix/contracts";
import type { ApiError } from "@tattvix/contracts";

export { formatDay, formatTime, partyLabel } from "@tattvix/api";

const longDateFormat = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });
const mediumDateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const formatLongDate = (value: Date) => longDateFormat.format(value);

export const formatDate = (key: string | null) => (key ? mediumDateFormat.format(new Date(`${key}T12:00:00`)) : "—");
export const formatDateTime = (iso: string | null) => (iso ? dateTimeFormat.format(new Date(iso)) : "—");

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
