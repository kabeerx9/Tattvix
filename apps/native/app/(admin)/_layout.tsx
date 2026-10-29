import { Redirect, Stack } from "expo-router";

import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { colors } from "@/src/design-system";
import { useCurrentUser } from "@/src/lib/current-user";
import { isPlatformAdmin } from "@/src/lib/workspace";

/**
 * Platform mode: the Tattwix-wide view for platform admins, gated on
 * `me.platformPermissions`. A stack: the tabs (Platform, Requests, Hotels,
 * Menu), then an organization, Onboard a hotel and Oversight pushed on top.
 */
export default function AdminLayout() {
  const user = useCurrentUser();

  if (user.isSignedIn === false) return <Redirect href="/sign-in" />;
  if (!user.data) {
    if (user.isError) return <RetryScreen onRetry={() => void user.refetch()} retrying={user.isFetching} />;
    return <PendingScreen />;
  }
  if (!isPlatformAdmin(user.data)) return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="organizations/[organizationSlug]" />
      <Stack.Screen name="onboard" />
      <Stack.Screen name="oversight" />
    </Stack>
  );
}
