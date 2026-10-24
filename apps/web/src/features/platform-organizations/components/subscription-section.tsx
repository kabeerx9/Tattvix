import type { PlatformPricing, PlatformSubscription } from "@tattvix/contracts";
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Fact, FactsRow, Panel, PanelHeader, PanelSection, StatusPill } from "@/components/design-system";
import { ApiError } from "@/lib/api";
import { formatMoneyWholeRupees } from "@/lib/money";

import { platformOrganizationMutations } from "../mutations";

const DEFAULT_EXTENSION_DAYS = 14;

/**
 * The platform admin's view of one hotel's entitlement: the dates, what the
 * hotel would pay, and the one action that exists today — moving the trial
 * end later. Payment recording comes with the money-movement work.
 */
export function SubscriptionSection({
  organizationSlug,
  subscription,
  pricing,
}: {
  organizationSlug: string;
  subscription: PlatformSubscription;
  pricing: PlatformPricing;
}) {
  const [extendOpen, setExtendOpen] = useState(false);
  return (
    <Panel>
      <PanelHeader
        title="Subscription"
        icon={CalendarClock}
        meta={<SubscriptionStatusPill subscription={subscription} />}
        actions={
          <Button variant="outline" size="sm" onClick={() => setExtendOpen(true)}>
            Extend trial
          </Button>
        }
      />
      <PanelSection>
        <FactsRow>
          <Fact label="Trial ends" value={subscription.trialEndsAt ? formatDate(subscription.trialEndsAt) : "—"} detail={subscription.entitled && subscription.status === "TRIALING" ? `${subscription.daysLeft} ${subscription.daysLeft === 1 ? "day" : "days"} left` : undefined} />
          <Fact label="Paid until" value={subscription.paidUntil ? formatDate(subscription.paidUntil) : "Not yet paid"} />
          <Fact
            label="Monthly price"
            value={formatMoneyWholeRupees(pricing.monthlyTotalMinor)}
            detail={`${pricing.activeProperties} × ${formatMoneyWholeRupees(pricing.pricePerPropertyMinor)} per property`}
          />
        </FactsRow>
      </PanelSection>
      {subscription.events.length ? (
        <PanelSection className="grid gap-2">
          {subscription.events.map((event) => (
            <p key={event.id} className="text-sm text-muted-foreground">
              <span className="text-foreground">{eventLabel(event.kind)}</span>
              {" · "}
              {event.previousTrialEndsAt
                ? `${formatDate(event.previousTrialEndsAt)} → ${formatDate(event.newTrialEndsAt)}`
                : `until ${formatDate(event.newTrialEndsAt)}`}
              {event.actorEmail ? ` · ${event.actorEmail}` : ""}
              {event.note ? ` · ${event.note}` : ""}
              <span className="text-subtle-foreground"> · {formatDate(event.createdAt)}</span>
            </p>
          ))}
        </PanelSection>
      ) : null}
      <ExtendTrialSheet
        organizationSlug={organizationSlug}
        subscription={subscription}
        open={extendOpen}
        onOpenChange={setExtendOpen}
      />
    </Panel>
  );
}

function SubscriptionStatusPill({ subscription }: { subscription: PlatformSubscription }) {
  switch (subscription.status) {
    case "PAID":
      return <StatusPill tone="success">Paid</StatusPill>;
    case "TRIALING":
      return <StatusPill tone={subscription.daysLeft <= 14 ? "warning" : "neutral"}>Free trial</StatusPill>;
    case "EXPIRED":
      return <StatusPill tone="danger">Trial ended</StatusPill>;
    default:
      return <StatusPill tone="danger">No subscription</StatusPill>;
  }
}

function ExtendTrialSheet({
  organizationSlug,
  subscription,
  open,
  onOpenChange,
}: {
  organizationSlug: string;
  subscription: PlatformSubscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const extend = useMutation(platformOrganizationMutations.extendTrial(queryClient));
  // Default to two weeks past the current end, or past today once expired.
  const base = subscription.entitled && subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : new Date();
  const [date, setDate] = useState(() => toDateInput(addDays(base, DEFAULT_EXTENSION_DAYS)));
  const [note, setNote] = useState("");
  const minDate = toDateInput(addDays(new Date(), 1));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!date) return;
    extend.mutate(
      {
        organizationSlug,
        // The trial runs to the end of the chosen day, local to the admin.
        input: { trialEndsAt: endOfLocalDay(date).toISOString(), note: note.trim() || undefined },
      },
      {
        onSuccess: () => {
          toast.success(`Trial extended to ${formatDate(endOfLocalDay(date).toISOString())}`);
          setNote("");
          onOpenChange(false);
        },
      },
    );
  }

  const error = extend.error instanceof ApiError ? extend.error.message : extend.error ? "The trial could not be extended." : null;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Extend trial">
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="extend-trial-date">New trial end</Label>
          <Input
            id="extend-trial-date"
            type="date"
            value={date}
            min={minDate}
            required
            onChange={(event) => setDate(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Must be later than the current end
            {subscription.trialEndsAt ? ` (${formatDate(subscription.trialEndsAt)})` : ""}.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="extend-trial-note">Reason</Label>
          <Input
            id="extend-trial-note"
            value={note}
            maxLength={500}
            placeholder="Onboarding took an extra week"
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="h-12 w-full rounded-xl text-[15px] font-semibold" disabled={extend.isPending || !date}>
          {extend.isPending ? "Extending…" : "Extend trial"}
        </Button>
      </form>
    </BottomSheet>
  );
}

function eventLabel(kind: PlatformSubscription["events"][number]["kind"]) {
  return kind === "TRIAL_STARTED" ? "Trial started" : "Trial extended";
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInput(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function endOfLocalDay(dateInput: string) {
  const [year, month, day] = dateInput.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso));
}
