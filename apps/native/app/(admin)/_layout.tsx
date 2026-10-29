import { Redirect, Tabs } from "expo-router";
import { LayoutDashboard, Menu } from "lucide-react-native";
import { useState } from "react";

import { PlaceSwitcherSheet } from "@/src/components/PlaceSwitcher";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { tabIcon } from "@/src/components/tab-icon";
import { TabBar, colors } from "@/src/design-system";
import { useCurrentUser } from "@/src/lib/current-user";
import { isPlatformAdmin } from "@/src/lib/workspace";

/**
 * Platform mode: the Tattwix-wide view for platform admins. Gated on `me.platformPermissions`; platform surfaces that change data stay web-only.
 * Same tab bar as guest and hotel mode: the Menu tab opens the place switcher.
 */
export default function AdminGroupLayout() {
  const user = useCurrentUser();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  if (user.isSignedIn === false) return <Redirect href="/sign-in" />;
  if (!user.data) {
    if (user.isError) return <RetryScreen onRetry={() => void user.refetch()} retrying={user.isFetching} />;
    return <PendingScreen />;
  }
  if (!isPlatformAdmin(user.data)) return <Redirect href="/" />;

  return (
    <>
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
        <Tabs.Screen name="index" options={{ title: "Platform", tabBarIcon: tabIcon(LayoutDashboard) }} />
        <Tabs.Screen
          name="menu"
          options={{ title: "Menu", tabBarIcon: tabIcon(Menu) }}
          listeners={{
            tabPress: (event) => {
              event.preventDefault();
              setSwitcherOpen(true);
            },
          }}
        />
      </Tabs>
      <PlaceSwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} current={{ kind: "admin" }} />
    </>
  );
}
