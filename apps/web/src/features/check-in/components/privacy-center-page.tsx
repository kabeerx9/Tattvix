// Privacy: which hotels can see the guest's ID right now, and which no longer
// can. One row per stay with one line of status; the detail (what the hotel
// opened, and stopping sharing) opens in a sheet. Mirrors
// apps/native/app/(guest)/(tabs)/privacy.tsx.
import {
  accessActivityLabel,
  describeGuestAccess,
  formatDateTime,
  getGuestAccessAction,
  getGuestAccessSummary,
  groupAccessEvents,
} from "@tattvix/api";
import type { GuestShare } from "@tattvix/contracts";
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
import { Button } from "@tattvix/ui/components/button";
import { cn } from "@tattvix/ui/lib/utils";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog, EmptyState, ListRow, PageHeader, Panel, SectionTitle } from "@/components/design-system";
import { checkInMutations } from "@/features/check-in/mutations";
import { checkInQueries } from "@/features/check-in/queries";
import { ApiError } from "@/lib/api";

export function PrivacyCenterPage() {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(checkInQueries.shares());
  const [openId, setOpenId] = useState<string | null>(null);
  const [stopTarget, setStopTarget] = useState<GuestShare | null>(null);
  const revokeMutation = useMutation(checkInMutations.revoke(queryClient));

  function stopSharing() {
    if (!stopTarget) return;
    revokeMutation.mutate(
      { stayId: stopTarget.id },
      {
        onSuccess: () => {
          setStopTarget(null);
          toast.success("Sharing stopped");
        },
      },
    );
  }

  // Grouped by what the guest cares about: can this hotel still see my ID?
  const rows = data.stays.map((stay) => ({ stay, summary: getGuestAccessSummary(getGuestAccessAction(stay)) }));
  const sharing = rows.filter((row) => row.summary.open);
  const ended = rows.filter((row) => !row.summary.open);
  const opened = data.stays.find((stay) => stay.id === openId) ?? null;
  const error = revokeMutation.error instanceof ApiError ? revokeMutation.error.message : revokeMutation.isError ? "Sharing could not be stopped." : null;

  const section = (title: string, list: typeof rows) =>
    list.length ? (
      <section className="grid gap-3">
        <SectionTitle title={title} />
        <Panel>
          <ul className="divide-y divide-border-soft">
            {list.map(({ stay, summary }) => (
              <li key={stay.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(stay.id)}
                  className="w-full px-5 py-3.5 text-left outline-none transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <ListRow
                    title={<span className="text-[15px] font-semibold [overflow-wrap:anywhere]">{stay.property.name}</span>}
                    meta={<span className={cn("text-sm", summary.open ? "text-success" : "text-muted-foreground")}>{summary.text}</span>}
                    trailing={<ChevronRight aria-hidden className="size-4 text-subtle-foreground" />}
                  />
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </section>
    ) : null;

  return (
    <div className="mx-auto grid max-w-3xl gap-8">
      <div className="grid gap-4">
        <PageHeader title="Privacy" meta="Hotels that can see your ID" />
      </div>

      {data.stays.length ? (
        <>
          {section("Sharing now", sharing)}
          {section("Ended", ended)}
        </>
      ) : (
        <Panel>
          <EmptyState icon={ShieldCheck} title="Nothing shared yet" description="A hotel sees your ID only after you check in there." />
        </Panel>
      )}

      <StaySheet
        stay={opened}
        onClose={() => setOpenId(null)}
        onStop={(stay) => {
          setOpenId(null);
          revokeMutation.reset();
          setStopTarget(stay);
        }}
      />
      <ConfirmDialog
        open={stopTarget !== null}
        onOpenChange={(open) => {
          if (!open && !revokeMutation.isPending) setStopTarget(null);
        }}
        title={`Stop sharing with ${stopTarget?.property.name ?? "this hotel"}?`}
        description={error ?? "They lose access to your ID right away. The stay stays in your history."}
        confirmLabel="Stop sharing"
        cancelLabel="Keep sharing"
        tone="destructive"
        onConfirm={stopSharing}
        pending={revokeMutation.isPending}
      />
    </div>
  );
}

function StaySheet({ stay, onClose, onStop }: { stay: GuestShare | null; onClose: () => void; onStop: (stay: GuestShare) => void }) {
  const access = stay ? getGuestAccessAction(stay) : null;
  const activity = stay ? groupAccessEvents(stay.accessEvents).slice(0, 8) : [];
  return (
    <BottomSheet
      open={stay !== null}
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={stay?.property.name ?? ""}
      footer={
        stay && access?.kind === "revocable" ? (
          <Button variant="outline" className="w-full" onClick={() => onStop(stay)}>
            Stop sharing
          </Button>
        ) : undefined
      }
    >
      {stay && access ? (
        <div className="grid gap-6">
          <div className="grid gap-1">
            <p className="text-[15px]">{describeGuestAccess(access, { format: formatDateTime })}</p>
            <p className="text-sm text-muted-foreground">
              {[stay.room ? `Room ${stay.room.number}` : null, stayMoment(stay)].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="grid gap-2">
            <p className="text-xs font-medium text-subtle-foreground">History</p>
            {activity.length ? (
              <ul className="grid gap-1.5 text-sm">
                {activity.map((group, index) => (
                  <li key={`${group.lastAt}-${index}`} className="flex justify-between gap-4">
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      {accessActivityLabel(group)}
                      {group.count > 1 ? ` ×${group.count}` : ""}
                    </span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">{formatDateTime(group.lastAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}

function stayMoment(stay: GuestShare) {
  if (stay.checkedOutAt) return `Checked out ${formatDateTime(stay.checkedOutAt)}`;
  if (stay.checkedInAt) return `Checked in ${formatDateTime(stay.checkedInAt)}`;
  return "Waiting for a room";
}
