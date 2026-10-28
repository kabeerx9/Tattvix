import type { GuestShare, OperationalStayStatus } from "@tattvix/contracts";

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
