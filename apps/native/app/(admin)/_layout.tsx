import { Redirect, Stack } from "expo-router";

import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { colors } from "@/src/design-system";
import { useCurrentUser } from "@/src/lib/current-user";
import { isPlatformAdmin } from "@/src/lib/workspace";

/**
 * Platform mode: the Tattwix-wide view for platform admins. Gated on `me.platformPermissions`; platform surfaces that change data stay web-only.
 */
export default function AdminGroupLayout() {
  const user = useCurrentUser();

  if (user.isSignedIn === false) return <Redirect href="/sign-in" />;
  if (!user.data) {
    if (user.isError) return <RetryScreen onRetry={() => void user.refetch()} retrying={user.isFetching} />;
    return <PendingScreen />;
  }
  if (!isPlatformAdmin(user.data)) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
