import type { Subscription } from "@tattvix/contracts";

/** How loudly the shell should talk about the trial. Escalates as it nears its end. */
export type TrialUrgency = "quiet" | "soon" | "urgent" | "expired";

const SOON_DAYS = 14;
const URGENT_DAYS = 3;

export function getTrialUrgency(subscription: Subscription): TrialUrgency {
  if (!subscription.entitled) return "expired";
  if (subscription.daysLeft <= URGENT_DAYS) return "urgent";
  if (subscription.daysLeft <= SOON_DAYS) return "soon";
  return "quiet";
}

export type SubscriptionNotice = {
  urgency: TrialUrgency;
  /** Short pill text: "Free trial", "Trial ends in 3 days", "Trial ended". */
  label: string;
  /** One operational line beside the pill. */
  message: string;
};

export function describeSubscription(
  subscription: Subscription,
  formatDate: (iso: string) => string = formatShortDate,
): SubscriptionNotice | null {
  if (subscription.status === "PAID") return null;
  const urgency = getTrialUrgency(subscription);
  const until = subscription.entitledUntil ? formatDate(subscription.entitledUntil) : null;
  const days = subscription.daysLeft;
  const dayWord = days === 1 ? "day" : "days";
  switch (urgency) {
    case "expired":
      return {
        urgency,
        label: subscription.status === "MISSING" ? "No subscription" : "Trial ended",
        message: "Check-ins and reports are paused. Contact Tattwix to continue.",
      };
    case "urgent":
      return {
        urgency,
        label: `Trial ends in ${days} ${dayWord}`,
        message: until ? `Ends ${until}. Contact Tattwix to keep going.` : "Contact Tattwix to keep going.",
      };
    case "soon":
      return {
        urgency,
        label: `${days} ${dayWord} left`,
        message: until ? `Free trial ends ${until}.` : "Free trial ending soon.",
      };
    default:
      return {
        urgency,
        label: "Free trial",
        message: until ? `${days} ${dayWord} left · ends ${until}` : `${days} ${dayWord} left`,
      };
  }
}

export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(iso));
}
