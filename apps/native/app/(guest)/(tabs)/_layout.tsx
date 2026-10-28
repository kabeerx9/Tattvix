import { Redirect, Tabs } from "expo-router";
import { CalendarDays, Home, Menu, ShieldCheck, UserRound } from "lucide-react-native";
import { useState } from "react";

import { PlaceSwitcherSheet } from "@/src/components/PlaceSwitcher";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { tabIcon } from "@/src/components/tab-icon";
import { TabBar, colors } from "@/src/design-system";
import { useCurrentUser } from "@/src/lib/current-user";

/**
 * Guest tabs: Home, Stays, Profile, Privacy and Menu. Companions and Account
 * are pushed on the parent stack (see ../_layout.tsx). The parent guards on
 * being signed in; every signed-in person may be a guest.
 */
export default function GuestTabsLayout() {
  const user = useCurrentUser();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  if (user.isSignedIn === false) return <Redirect href="/sign-in" />;
  if (!user.data) {
    if (user.isError) return <RetryScreen onRetry={() => void user.refetch()} retrying={user.isFetching} />;
    return <PendingScreen />;
  }

  return (
    <>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
      >
        <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon(Home) }} />
        <Tabs.Screen name="stays" options={{ title: "Stays", tabBarIcon: tabIcon(CalendarDays) }} />
        <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon(UserRound) }} />
        <Tabs.Screen name="privacy" options={{ title: "Privacy", tabBarIcon: tabIcon(ShieldCheck) }} />
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
      <PlaceSwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} current={{ kind: "guest" }} />
    </>
  );
}
