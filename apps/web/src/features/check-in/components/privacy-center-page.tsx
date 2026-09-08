import type { GuestShare, IdentityAccessAction } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  BedDouble,
  Clock3,
  Eye,
  FileImage,
  History,
  Hotel,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog, EmptyState, PageHeader, Surface } from "@/components/design-system";
import { checkInMutations } from "@/features/check-in/mutations";
import { checkInQueries } from "@/features/check-in/queries";
import { ApiError } from "@/lib/api";

export function PrivacyCenterPage() {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(checkInQueries.shares());
  const [revokeTarget, setRevokeTarget] = useState<GuestShare | null>(null);
  const revokeMutation = useMutation(checkInMutations.revoke(queryClient));

  function revoke() {
    if (!revokeTarget) return;
    const stayId = revokeTarget.id;
    revokeMutation.mutate(
      { stayId },
      {
        onSuccess: () => {
          setRevokeTarget(null);
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

  // Operational status drives current-vs-past: a stay stays "current" for
  // the guest until the hotel actually checks them out, independent of
  // whether identity-sharing consent (stay.status) was separately revoked
  // or closed out by staff. Mirrors the current/history split hotel staff
  // see for the same reason.
  const currentStays = data.stays.filter(
    (stay) => stay.operationalStatus !== "CHECKED_OUT",
  );
  const pastStays = data.stays.filter(
    (stay) => stay.operationalStatus === "CHECKED_OUT",
  );

  return (
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <PageHeader
        eyebrow="Guest privacy"
        title="Hotel access history"
        description="See where each shared stay stands, when hotel staff opened your identity, and whether access is still active."
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
        <>
          <Section
            title="Current stay"
            description="Your most recent shared stay, live from the hotel's front desk."
            icon={Hotel}
          >
            {currentStays.length ? (
              <div className="grid gap-4">
                {currentStays.map((stay) => (
                  <ShareCard
                    key={stay.id}
                    stay={stay}
                    isRevoking={
                      revokeMutation.isPending &&
                      revokeMutation.variables?.stayId === stay.id
                    }
                    onAskRevoke={() => setRevokeTarget(stay)}
                  />
                ))}
              </div>
            ) : (
              <Surface>
                <EmptyState
                  icon={Hotel}
                  title="No active stay right now"
                  description="Once a hotel checks you in, it will show up here with your room number."
                />
              </Surface>
            )}
          </Section>

          <Section
            title="Past stays"
            description="Completed stays, kept for your own record of what was shared and when."
            icon={History}
          >
            {pastStays.length ? (
              <div className="grid gap-4">
                {pastStays.map((stay) => (
                  <ShareCard
                    key={stay.id}
                    stay={stay}
                    isRevoking={
                      revokeMutation.isPending &&
                      revokeMutation.variables?.stayId === stay.id
                    }
                    onAskRevoke={() => setRevokeTarget(stay)}
                  />
                ))}
              </div>
            ) : (
              <Surface>
                <EmptyState
                  icon={History}
                  title="No past stays yet"
                  description="Past stays will appear here after checkout."
                />
              </Surface>
            )}
          </Section>
        </>
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
      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title={`Revoke ${revokeTarget?.property.name ?? "hotel"} access?`}
        description="The hotel immediately loses access to your shared identity and document images. Your stay history remains for your own record."
        confirmLabel="Revoke access"
        cancelLabel="Keep sharing"
        tone="destructive"
        onConfirm={revoke}
        pending={revokeMutation.isPending}
      />
    </div>
  );
}

function Section({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Hotel;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ShareCard({
  stay,
  isRevoking,
  onAskRevoke,
}: {
  stay: GuestShare;
  isRevoking: boolean;
  onAskRevoke: () => void;
}) {
  const accessActive =
    stay.status !== "REVOKED" &&
    Boolean(
      stay.hotelAccessExpiresAt &&
        new Date(stay.hotelAccessExpiresAt).getTime() > Date.now(),
    );
  const operational = operationalStatusPill(stay);

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
              <span className={operational.className}>
                {operational.label}
              </span>
              {stay.room ? (
                <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <BedDouble className="size-3" />
                  Room {stay.room.number}
                </span>
              ) : null}
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {accessActive ? "Identity access active" : statusLabel(stay)}
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
          <Button
            variant="outline"
            size="sm"
            disabled={isRevoking}
            onClick={onAskRevoke}
          >
            <ShieldOff />
            {isRevoking ? "Revoking..." : "Revoke access"}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 border-t bg-muted/30 p-5 sm:grid-cols-[220px_220px_minmax(0,1fr)] sm:p-6">
        <div>
          <p className="text-xs font-medium">Stay timeline</p>
          <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <Clock3 className="mt-0.5 size-3.5 shrink-0" />
            {stay.checkedOutAt
              ? `Checked out ${formatDateTime(stay.checkedOutAt)}`
              : stay.checkedInAt
                ? `Checked in ${formatDateTime(stay.checkedInAt)}`
                : "Not checked in yet"}
          </p>
        </div>
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
              {groupAccessEvents(stay.accessEvents)
                .slice(0, 8)
                .map((group, index) => (
                  <div
                    key={`${group.lastAt}-${index}`}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    {group.action === "DOCUMENT_VIEWED" ? (
                      <FileImage className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                    <span>
                      {activityLabel(group.action, group.imageSide)}
                      {group.count > 1 ? ` ×${group.count}` : ""}
                    </span>
                    <span className="ml-auto whitespace-nowrap">
                      {formatDateTime(group.lastAt)}
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

type AccessEvent = GuestShare["accessEvents"][number];

type AccessEventGroup = {
  action: IdentityAccessAction;
  imageSide: "FRONT" | "BACK" | null;
  count: number;
  lastAt: string;
};

// Collapse repeat views per record: a review session opens details plus
// each image, and refetches (tab refocus, reload) audit again — the guest
// wants "how often was each record opened", not every issuance row.
function groupAccessEvents(events: AccessEvent[]): AccessEventGroup[] {
  const groups = new Map<string, AccessEventGroup>();
  for (const event of events) {
    const key = `${event.action}:${event.imageSide ?? ""}`;
    const current = groups.get(key);
    if (current) {
      current.count += 1;
      if (
        new Date(event.createdAt).getTime() >
        new Date(current.lastAt).getTime()
      ) {
        current.lastAt = event.createdAt;
      }
    } else {
      groups.set(key, {
        action: event.action,
        imageSide: event.imageSide,
        count: 1,
        lastAt: event.createdAt,
      });
    }
  }
  return [...groups.values()];
}

function activityLabel(
  action: IdentityAccessAction,
  side: "FRONT" | "BACK" | null,
) {
  if (action === "DOCUMENT_VIEWED") {
    return `${side === "BACK" ? "Back" : "Front"} document image opened`;
  }
  if (action === "DETAILS_VIEWED") return "Identity details opened";
  if (action === "STAY_CLOSED") return "Hotel finished identity review";
  return "Consent revoked";
}

function operationalStatusPill(stay: GuestShare) {
  if (stay.operationalStatus === "CHECKED_IN") {
    return {
      label: "Checked in",
      className:
        "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300",
    };
  }
  if (stay.operationalStatus === "CHECKED_OUT") {
    return {
      label: "Checked out",
      className:
        "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground",
    };
  }
  return {
    label: "Awaiting check-in",
    className:
      "rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300",
  };
}

function statusLabel(stay: GuestShare) {
  if (stay.status === "REVOKED") return "Consent revoked";
  if (stay.status === "CLOSED") return "Identity review complete";
  return "Access expired";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
