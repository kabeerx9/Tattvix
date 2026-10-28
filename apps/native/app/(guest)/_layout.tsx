import { Redirect, Stack } from "expo-router";

import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { colors } from "@/src/design-system";
import { useCurrentUser } from "@/src/lib/current-user";

// Guest mode is a stack: the tabs, then Companions and Account pushed on top
// (a tab hidden with `href: null` cannot be navigated to at all).
export default function GuestLayout() {
  const user = useCurrentUser();

  if (user.isSignedIn === false) return <Redirect href="/sign-in" />;
  if (!user.data) {
    if (user.isError) return <RetryScreen onRetry={() => void user.refetch()} retrying={user.isFetching} />;
    return <PendingScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="getting-started" />
      <Stack.Screen name="companions/index" />
      <Stack.Screen name="companions/[companionId]" />
      <Stack.Screen name="account" />
      <Stack.Screen name="referrals" />
    </Stack>
  );
}
