import type { GuestShare, IdentityAccessAction } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  Clock3,
  Eye,
  FileImage,
  Hotel,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, Surface } from "@/components/design-system";
import { checkInMutations } from "@/features/check-in/mutations";
import { checkInQueries } from "@/features/check-in/queries";
import { ApiError } from "@/lib/api";

export function PrivacyCenterPage() {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(checkInQueries.shares());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const revokeMutation = useMutation(checkInMutations.revoke(queryClient));

  function revoke(stayId: string) {
    revokeMutation.mutate(
      { stayId },
      {
        onSuccess: () => {
          setConfirmingId(null);
          toast.success("Hotel identity access revoked");
        },
      },
    );
  }

  const error =
    revokeMutation.error instanceof ApiError
      ? revokeMutation.error.message
      : revokeMutation.isError
        ? "Hotel access could not be revoked."
        : null;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <PageHeader
        eyebrow="Guest privacy"
        title="Hotel access history"
        description="See every stay-specific identity share, when hotel staff opened it, and whether access is still active."
      />

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {data.stays.length ? (
        <div className="grid gap-4">
          {data.stays.map((stay) => (
            <ShareCard
              key={stay.id}
              stay={stay}
              confirming={confirmingId === stay.id}
              isRevoking={
                revokeMutation.isPending &&
                revokeMutation.variables?.stayId === stay.id
              }
              onAskRevoke={() => setConfirmingId(stay.id)}
              onCancelRevoke={() => setConfirmingId(null)}
              onRevoke={() => revoke(stay.id)}
            />
          ))}
        </div>
      ) : (
        <Surface className="grid place-items-center gap-4 p-8 text-center sm:p-12">
          <span className="grid size-12 place-items-center rounded-xl bg-muted">
            <ShieldCheck className="size-6" />
          </span>
          <div className="max-w-md">
            <h2 className="text-lg font-semibold">Nothing shared yet</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Saving your profile and documents does not share them. Approved
              hotel check-ins will appear here.
            </p>
          </div>
        </Surface>
      )}
    </div>
  );
}

function ShareCard({
  stay,
  confirming,
  isRevoking,
  onAskRevoke,
  onCancelRevoke,
  onRevoke,
}: {
  stay: GuestShare;
  confirming: boolean;
  isRevoking: boolean;
  onAskRevoke: () => void;
  onCancelRevoke: () => void;
  onRevoke: () => void;
}) {
  const accessActive =
    stay.status !== "REVOKED" &&
    Boolean(
      stay.hotelAccessExpiresAt &&
        new Date(stay.hotelAccessExpiresAt).getTime() > Date.now(),
    );

  return (
    <Surface className="grid gap-0 overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted">
            <Hotel className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold">
                {stay.property.name}
              </h2>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {accessActive ? "Access active" : statusLabel(stay)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stay.property.organization.name}
              {stay.submittedAt
                ? ` · Shared ${formatDateTime(stay.submittedAt)}`
                : ""}
            </p>
          </div>
        </div>

        {accessActive ? (
          confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="w-full text-xs text-destructive sm:w-auto">
                End future access now?
              </p>
              <Button
                size="sm"
                variant="ghost"
                disabled={isRevoking}
                onClick={onCancelRevoke}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={isRevoking}
                onClick={onRevoke}
              >
                {isRevoking ? "Revoking..." : "Confirm revoke"}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={onAskRevoke}>
              <ShieldOff />
              Revoke access
            </Button>
          )
        ) : null}
      </div>

      <div className="grid gap-4 border-t bg-muted/30 p-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:p-6">
        <div>
          <p className="text-xs font-medium">Access boundary</p>
          <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <Clock3 className="mt-0.5 size-3.5 shrink-0" />
            {stay.status === "REVOKED"
              ? "Revoked by you"
              : stay.hotelAccessExpiresAt
                ? `No later than ${formatDateTime(stay.hotelAccessExpiresAt)}`
                : "No active hotel access"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium">Recorded activity</p>
          {stay.accessEvents.length ? (
            <div className="mt-2 grid gap-2">
              {stay.accessEvents.slice(0, 8).map((event, index) => (
                <div
                  key={`${event.createdAt}-${index}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  {event.action === "DOCUMENT_VIEWED" ? (
                    <FileImage className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                  <span>{activityLabel(event.action, event.imageSide)}</span>
                  <span className="ml-auto whitespace-nowrap">
                    {formatDateTime(event.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              No hotel identity views have been recorded.
            </p>
          )}
        </div>
      </div>
    </Surface>
  );
}

function activityLabel(
  action: IdentityAccessAction,
  side: "FRONT" | "BACK" | null,
) {
  if (action === "DOCUMENT_VIEWED") {
    return `${side === "BACK" ? "Back" : "Front"} document image opened`;
  }
  if (action === "DETAILS_VIEWED") return "Identity details opened";
  if (action === "STAY_CLOSED") return "Stay marked checked out";
  return "Consent revoked";
}

function statusLabel(stay: GuestShare) {
  if (stay.status === "REVOKED") return "Consent revoked";
  if (stay.status === "CLOSED") return "Stay closed";
  return "Access expired";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
