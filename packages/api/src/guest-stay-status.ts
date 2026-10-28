import type { OperationalStayStatus } from "@tattvix/contracts";

/** The one name for each stay status, shown to guests and staff alike. */
export function stayStatusLabel(status: OperationalStayStatus): string {
  return {
    PENDING_CHECK_IN: "Waiting for a room",
    CHECKED_IN: "Checked in",
    CHECKED_OUT: "Checked out",
  }[status];
}
