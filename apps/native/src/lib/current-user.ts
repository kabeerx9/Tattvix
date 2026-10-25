import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";

import { queries } from "./api";

/**
 * The signed-in person's /me. Every layout that guards on access calls this;
 * the query cache dedupes, so one request serves the whole tree. Disabled while
 * signed out, so `data` is undefined there.
 */
export function useCurrentUser() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const query = useQuery({
    ...queries.currentUser.detail(userId ?? "signed-out"),
    enabled: isLoaded && Boolean(isSignedIn && userId),
  });
  return { ...query, clerkUserId: userId ?? null, isSignedIn: isLoaded ? Boolean(isSignedIn) : null };
}
