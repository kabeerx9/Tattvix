import { Redirect, Stack, useGlobalSearchParams, usePathname } from "expo-router";

import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { useCurrentUser } from "@/src/lib/current-user";
import { setPendingPath } from "@/src/lib/pending-path";

/** Organization settings have no property prerequisite, so they live outside hotel tabs. */
export default function HotelTeamLayout() {
  const { organizationSlug } = useGlobalSearchParams<{ organizationSlug: string }>();
  const pathname = usePathname();
  const user = useCurrentUser();

  if (user.isSignedIn === false) {
    setPendingPath(pathname);
    return <Redirect href="/sign-in" />;
  }
  if (!user.data) {
    if (user.isError) return <RetryScreen onRetry={() => void user.refetch()} retrying={user.isFetching} />;
    return <PendingScreen />;
  }
  const membership = user.data.memberships.find((item) => item.organization.slug === organizationSlug);
  if (!membership?.permissions.includes("members:manage")) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }}><Stack.Screen name="[organizationSlug]/team" /></Stack>;
}
