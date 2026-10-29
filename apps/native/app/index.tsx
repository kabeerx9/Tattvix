import { Show } from "@clerk/expo";
import { Redirect, type Href } from "expo-router";
import { useState } from "react";

import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { useCurrentUser } from "@/src/lib/current-user";
import { readLastPlace } from "@/src/lib/last-place";
import { takePendingPath } from "@/src/lib/pending-path";
import { getLanding, hotelHref } from "@/src/lib/workspace";

// The root. Signed in: load `me` and go where this person belongs. Signed out:
// the sign-in screen. Sign-in has its own route because "/" is ambiguous from
// inside a route group (a group's own index also answers to "/"), which made a
// signed-out <Redirect href="/"> loop instead of leaving the group.
export default function WelcomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <Landing />
      </Show>
      <Show when="signed-out">
        <Redirect href="/sign-in" />
      </Show>
    </>
  );
}

// Members land in the hotel they used last (else their first); everyone else
// lands in guest mode.
function Landing() {
  const user = useCurrentUser();
  // Taken once on mount: a sign-in that began from a check-in QR resumes there.
  const [resumePath] = useState(() => takePendingPath());
  if (!user.data) {
    if (user.isError) return <RetryScreen onRetry={() => void user.refetch()} retrying={user.isFetching} />;
    return <PendingScreen />;
  }
  if (resumePath) return <Redirect href={resumePath as Href} />;
  const landing = getLanding(user.data, user.clerkUserId ? readLastPlace(user.clerkUserId) : null);
  return <Redirect href={(landing.kind === "hotel" ? hotelHref(landing.place) : "/(guest)") as Href} />;
}
