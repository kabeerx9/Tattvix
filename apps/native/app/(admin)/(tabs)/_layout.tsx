import { Tabs } from "expo-router";
import { ClipboardList, Hotel, LayoutDashboard, Menu } from "lucide-react-native";
import { useState } from "react";

import { PlaceSwitcherSheet } from "@/src/components/PlaceSwitcher";
import { tabIcon } from "@/src/components/tab-icon";
import { TabBar, colors } from "@/src/design-system";

/**
 * Platform tabs: Platform (overview), Requests, Hotels and Menu. The Menu tab
 * opens the place switcher instead of navigating. Access is guarded one
 * layout up; an organization, Onboard and Oversight are pushed on that stack.
 */
export default function AdminTabsLayout() {
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <>
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
        <Tabs.Screen name="index" options={{ title: "Platform", tabBarIcon: tabIcon(LayoutDashboard) }} />
        <Tabs.Screen name="requests" options={{ title: "Requests", tabBarIcon: tabIcon(ClipboardList) }} />
        <Tabs.Screen name="hotels" options={{ title: "Hotels", tabBarIcon: tabIcon(Hotel) }} />
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
