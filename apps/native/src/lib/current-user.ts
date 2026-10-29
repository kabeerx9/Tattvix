import { useAuth } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { queries } from "./api";
import { setTelemetryUser } from "./telemetry";

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
  // Sentry identifies the person by internal numeric id only, set once `me`
  // loads and cleared when the session ends (data is undefined signed out).
  const telemetryId = query.data?.id ?? null;
  useEffect(() => {
    setTelemetryUser(telemetryId);
  }, [telemetryId]);
  return { ...query, clerkUserId: userId ?? null, isSignedIn: isLoaded ? Boolean(isSignedIn) : null };
}
