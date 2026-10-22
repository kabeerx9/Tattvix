import type { GuestStay } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { cn } from "@tattvix/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Clock3 } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog, StatusPill } from "@/components/design-system";
import { checkInMutations } from "@/features/check-in/mutations";
import { formatDateTime } from "@/features/check-in/format";
import { guestStayStatusLabel } from "@/features/guest-stays/status";
import { ApiError } from "@/lib/api";

import { CheckInBrandBar, StepFooter, footerButtonClassName } from "./check-in-layout";

/** After sending: status that updates on its own, the room, and stop sharing. */
export function CheckInStayStatus({
  token,
  stay,
  propertyName,
  onNewVisit,
}: {
  token: string;
  stay: GuestStay;
  propertyName: string;
  onNewVisit: () => void;
}) {
  const queryClient = useQueryClient();
  const revokeMutation = useMutation(checkInMutations.revoke(queryClient));
  const [confirming, setConfirming] = useState(false);
  const revoked = stay.status === "REVOKED";
  const pending = stay.operationalStatus === "PENDING_CHECK_IN";
  const checkedOut = stay.operationalStatus === "CHECKED_OUT";

  const title = revoked
    ? "Sharing stopped"
    : stay.room && !checkedOut
      ? `Room ${stay.room.number}`
      : pending
        ? "Sent to reception"
        : guestStayStatusLabel(stay.operationalStatus);
  const body = revoked
    ? `${propertyName} can no longer open your details. Reception may ask to see your ID at the desk.`
    : checkedOut
      ? "Thanks for staying. Your bill stays available below."
      : stay.room
        ? `You’re checked in at ${propertyName}. Collect your key at the desk.`
        : "Show this screen at the desk. Reception is assigning your room; this page updates on its own.";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <CheckInBrandBar />
      <main className="mx-auto grid w-full max-w-xl flex-1 content-center justify-items-center gap-4 px-6 py-10 text-center">
        <span
          className={cn(
            "grid size-16 place-items-center rounded-full motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in-0 motion-safe:duration-200",
            revoked ? "bg-muted text-muted-foreground" : "bg-primary-tint text-primary",
          )}
        >
          <Check className="size-8" strokeWidth={2.5} />
        </span>
        <StatusPill tone={revoked ? "neutral" : pending ? "warning" : stay.operationalStatus === "CHECKED_IN" ? "success" : "neutral"}>
          {revoked ? "Not shared" : guestStayStatusLabel(stay.operationalStatus)}
        </StatusPill>
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] tabular-nums [overflow-wrap:anywhere]">
          {title}
        </h1>
        <p className="max-w-80 text-[15px] leading-6 text-muted-foreground [overflow-wrap:anywhere]">{body}</p>
        {!revoked && stay.hotelAccessExpiresAt ? (
          <p className="flex items-center gap-1.5 text-[13px] text-subtle-foreground">
            <Clock3 className="size-4" />
            Hotel access ends by {formatDateTime(stay.hotelAccessExpiresAt)}
          </p>
        ) : null}
        {revokeMutation.isError ? (
          <p role="alert" className="text-[13px] text-destructive">
            {revokeMutation.error instanceof ApiError
              ? revokeMutation.error.message
              : "Could not stop sharing. Please try again."}
          </p>
        ) : null}
      </main>

      <StepFooter>
        <Button
          nativeButton={false}
          className={footerButtonClassName}
          render={<Link to="/stays/$stayId" params={{ stayId: stay.id }} />}
        >
          View stay and bill
          <ArrowRight />
        </Button>
        {checkedOut ? (
          <Button variant="outline" className={footerButtonClassName} onClick={onNewVisit}>
            Start a new visit
          </Button>
        ) : null}
        {!revoked ? (
          <Button
            variant="ghost"
            className={cn(footerButtonClassName, "font-medium text-muted-foreground")}
            disabled={revokeMutation.isPending}
            onClick={() => setConfirming(true)}
          >
            Stop sharing my details
          </Button>
        ) : null}
      </StepFooter>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Stop sharing with ${propertyName}?`}
        description="The hotel loses access to your details and ID straight away."
        confirmLabel="Stop sharing"
        tone="destructive"
        pending={revokeMutation.isPending}
        onConfirm={() =>
          revokeMutation.mutate({ token, stayId: stay.id }, { onSettled: () => setConfirming(false) })
        }
      />
    </div>
  );
}
