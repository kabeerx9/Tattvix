import type { OperationalStayStatus } from "@tattvix/contracts";
export function guestStayStatusLabel(status: OperationalStayStatus): string {
  return {
    PENDING_CHECK_IN: "Waiting for reception",
    CHECKED_IN: "Checked in",
    CHECKED_OUT: "Checked out",
  }[status];
}
