import type { MeResponse, Subscription } from "@tattvix/contracts";

function subscriptionLabel(subscription: Subscription) {
  if (subscription.status === "MISSING") return "Subscription unavailable";
  if (!subscription.entitled) return "Subscription expired";
  if (subscription.status === "TRIALING") {
    return `Free trial · ${subscription.daysLeft} ${subscription.daysLeft === 1 ? "day" : "days"} left`;
  }
  return "Subscription active";
}

/** Presentation only: destination routes and the API still enforce access. */
export function getAccountSettings(user: Pick<MeResponse, "memberships"> | null) {
  const hotels = (user?.memberships ?? [])
    .filter((membership) => membership.permissions.includes("hotel:view") && membership.permissions.includes("hotel:manage"))
    .map((membership) => ({
      id: membership.id,
      organization: membership.organization,
      properties: membership.properties,
      subscriptionLabel: subscriptionLabel(membership.subscription),
    }));
  return { isOwner: hotels.length > 0, hotels };
}
