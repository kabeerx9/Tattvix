import { Tabs } from "expo-router";
import { BedDouble, CalendarDays, Menu, Sun } from "lucide-react-native";
import { useState } from "react";

import { PlaceSwitcherSheet } from "@/src/components/PlaceSwitcher";
import { tabIcon } from "@/src/components/tab-icon";
import { TabBar, colors } from "@/src/design-system";
import { useHotelPlace } from "@/src/lib/hotel-place";

// Today, Stays, Rooms. The Menu tab opens the place switcher instead
// of navigating. Access is already guarded one layout up.
export default function HotelTabsLayout() {
  const place = useHotelPlace();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <>
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
        <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: tabIcon(Sun) }} />
        <Tabs.Screen name="stays" options={{ title: "Stays", tabBarIcon: tabIcon(CalendarDays) }} />
        <Tabs.Screen name="rooms" options={{ title: "Rooms", tabBarIcon: tabIcon(BedDouble) }} />
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
      <PlaceSwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} current={{ kind: "hotel", key: place.key }} />
    </>
  );
}
