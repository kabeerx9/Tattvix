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

import { ConfirmDialog, EmptyState, PageHeader, Panel, PanelHeader, StatusPill, KpiStrip, Kpi } from "@/components/design-system";
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
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        title="Hotel access history"
      />

      <KpiStrip>
        <Kpi icon={Hotel} label="Current stays" value={currentStays.length} />
        <Kpi icon={History} label="Past stays" value={pastStays.length} />
        <Kpi icon={ShieldOff} label="Revoked" value={data.stays.filter((stay) => stay.status === "REVOKED").length} />
      </KpiStrip>
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {data.stays.length ? (
        <>
          <Section
            title="Current stays"
            description="Your current stays and the identity access you approved."
            icon={Hotel}
          >
            {currentStays.length ? (
              <div className="grid">
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
              <>
                <EmptyState
                  icon={Hotel}
                  title="No active stay right now"
                  description="Once a hotel checks you in, it will show up here with your room number."
                />
              </>
            )}
          </Section>

          <Section
            title="Past stays"
            description="Completed stays, kept for your own record of what was shared and when."
            icon={History}
          >
            {pastStays.length ? (
              <div className="grid">
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
              <>
                <EmptyState
                  icon={History}
                  title="No past stays yet"
                  description="Past stays will appear here after checkout."
                />
              </>
            )}
          </Section>
        </>
      ) : (
        <Panel><EmptyState icon={ShieldCheck} title="Nothing shared yet" description="Saving your profile and documents does not share them. Approved hotel check-ins will appear here." /></Panel>
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
    <Panel>
      <PanelHeader title={title} icon={Icon} />
      <p className="px-5 py-3 text-xs text-subtle-foreground">{description}</p>
      {children}
    </Panel>
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


  return (
    <div className="border-t border-border-soft">
      <div className="group flex min-h-11 flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <Hotel className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-sm font-semibold">
                {stay.property.name}
              </h2>
              <StatusPill tone={stay.operationalStatus === "PENDING_CHECK_IN" ? "warning" : stay.operationalStatus === "CHECKED_IN" ? "success" : "neutral"}>{stay.operationalStatus === "PENDING_CHECK_IN" ? "Awaiting check-in" : stay.operationalStatus === "CHECKED_IN" ? "Checked in" : "Checked out"}</StatusPill>
              {stay.room ? (
                <span className="flex items-center gap-1 text-xs text-subtle-foreground">
                  <BedDouble className="size-3" />
                  Room {stay.room.number}
                </span>
              ) : null}
              <StatusPill tone={stay.status === "REVOKED" ? "danger" : accessActive ? "success" : "neutral"}>
                {accessActive ? "Identity access active" : statusLabel(stay)}
              </StatusPill>
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

      <div className="grid gap-4 border-t border-border-soft px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
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
        <div className="min-w-0">
          <p className="text-xs font-medium">Recorded activity</p>
          {stay.accessEvents.length ? (
            <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[300px] text-xs"><thead className="bg-muted text-left text-subtle-foreground"><tr><th className="px-3 py-2 font-medium">Activity</th><th className="px-3 py-2 text-right font-medium">Last recorded</th></tr></thead><tbody>
              {groupAccessEvents(stay.accessEvents)
                .slice(0, 8)
                .map((group, index) => (
                  <tr key={`${group.lastAt}-${index}`} className="border-t border-border-soft text-muted-foreground"><td className="px-3 py-2">
                    {group.action === "DOCUMENT_VIEWED" ? (
                      <FileImage className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                    <span>
                      {activityLabel(group.action, group.imageSide, group.companionName)}
                      {group.count > 1 ? ` ×${group.count}` : ""}
                    </span>
                    </td><td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">{formatDateTime(group.lastAt)}</td></tr>
                ))}
            </tbody></table></div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              No hotel identity views have been recorded.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

type AccessEvent = GuestShare["accessEvents"][number];

type AccessEventGroup = {
  action: IdentityAccessAction;
  imageSide: "FRONT" | "BACK" | null;
  companionName?: string | null;
  count: number;
  lastAt: string;
};

// Collapse repeat views per record: a review session opens details plus
// each image, and refetches (tab refocus, reload) audit again — the guest
// wants "how often was each record opened", not every issuance row.
function groupAccessEvents(events: AccessEvent[]): AccessEventGroup[] {
  const groups = new Map<string, AccessEventGroup>();
  for (const event of events) {
    const key = `${event.action}:${event.imageSide ?? ""}:${event.companionId ?? 0}`;
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
        companionName: event.companionId ? event.companionName || "Companion" : null,
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
  companionName?: string | null,
) {
  if (action === "DOCUMENT_VIEWED") {
    return `${companionName ? `${companionName}: ` : ""}${side === "BACK" ? "Back" : "Front"} document image opened`;
  }
  if (action === "DETAILS_VIEWED") return "Identity details opened";
  if (action === "STAY_CLOSED") return "Hotel finished identity review";
  return "Consent revoked";
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
