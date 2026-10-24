import type { Subscription } from "@tattvix/contracts";
import { cn } from "@tattvix/ui/lib/utils";

import { StatusPill } from "@/components/design-system";

import { describeSubscription, type TrialUrgency } from "../status";

const pillTone: Record<TrialUrgency, "neutral" | "warning" | "danger"> = {
  quiet: "neutral",
  soon: "warning",
  urgent: "warning",
  expired: "danger",
};

/**
 * One quiet line under the shell header for a hotel on trial: the clock is a
 * contract, so the hotel sees it from day one. Louder as the end nears; red
 * and explicit once expired. Nothing for a paid hotel.
 */
export function SubscriptionBanner({ subscription }: { subscription: Subscription }) {
  const notice = describeSubscription(subscription);
  if (!notice) return null;
  const loud = notice.urgency === "urgent" || notice.urgency === "expired";
  return (
    <div role="status" className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm sm:px-8">
        <StatusPill tone={pillTone[notice.urgency]}>{notice.label}</StatusPill>
        <span className={cn(loud ? "font-medium text-foreground" : "text-muted-foreground")}>
          {notice.message}
        </span>
      </div>
    </div>
  );
}
