import { Redirect, Tabs, useLocalSearchParams } from "expo-router";
import { BedDouble, CalendarDays, Menu, Sun, Users } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { PlaceSwitcherSheet } from "@/src/components/PlaceSwitcher";
import { ReadOnlyBanner } from "@/src/components/ReadOnlyBanner";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { tabIcon } from "@/src/components/tab-icon";
import { TabBar, colors } from "@/src/design-system";
import { useCurrentUser } from "@/src/lib/current-user";
import { HotelPlaceProvider } from "@/src/lib/hotel-place";
import { writeLastPlace } from "@/src/lib/last-place";
import { findHotelPlace, isReadOnly } from "@/src/lib/workspace";

/**
 * Hotel mode. Guards on `me`: the route's hotel must be one the person can
 * open, otherwise the landing route picks somewhere they can. A failed `me`
 * shows a retry, never a sign-out. The Menu tab opens the place switcher
 * instead of navigating.
 */
export default function HotelLayout() {
  const { organizationSlug, propertySlug } = useLocalSearchParams<{ organizationSlug: string; propertySlug: string }>();
  const user = useCurrentUser();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const place = findHotelPlace(user.data ?? null, organizationSlug, propertySlug);
  const placeKey = place?.key ?? null;

  useEffect(() => {
    if (placeKey && user.clerkUserId) writeLastPlace(user.clerkUserId, placeKey);
  }, [placeKey, user.clerkUserId]);

  if (user.isSignedIn === false) return <Redirect href="/" />;
  if (!user.data) {
    if (user.isError) return <RetryScreen onRetry={() => void user.refetch()} retrying={user.isFetching} />;
    return <PendingScreen />;
  }
  if (!place) return <Redirect href="/" />;

  return (
    <HotelPlaceProvider value={place}>
      <View style={styles.root}>
        {isReadOnly(place) ? <ReadOnlyBanner status={place.subscription.status} /> : null}
        <Tabs
          tabBar={(props) => <TabBar {...props} />}
          screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
        >
          <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: tabIcon(Sun) }} />
          <Tabs.Screen name="stays" options={{ title: "Stays", tabBarIcon: tabIcon(CalendarDays) }} />
          <Tabs.Screen name="rooms" options={{ title: "Rooms", tabBarIcon: tabIcon(BedDouble) }} />
          <Tabs.Screen name="guests" options={{ title: "Guests", tabBarIcon: tabIcon(Users) }} />
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
      </View>
    </HotelPlaceProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background } });
