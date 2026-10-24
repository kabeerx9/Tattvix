import { useRouteContext } from "@tanstack/react-router";

import { findAccessibleMembership } from "@/lib/hotel-scope";

/**
 * The signed-in user's view of one hotel's subscription, from the already
 * loaded /api/me payload. `entitled` is the one flag to disable controls on;
 * the server is still the authority and answers 402 regardless.
 */
export function useHotelSubscription(organizationSlug: string) {
  const { auth } = useRouteContext({ from: "__root__" });
  const membership = findAccessibleMembership(auth.currentUser, organizationSlug);
  return membership?.subscription ?? null;
}
