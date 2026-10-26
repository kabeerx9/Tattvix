import { Redirect, Stack, usePathname, useGlobalSearchParams } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { ReadOnlyBanner } from "@/src/components/ReadOnlyBanner";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { colors } from "@/src/design-system";
import { useCurrentUser } from "@/src/lib/current-user";
import { HotelPlaceProvider } from "@/src/lib/hotel-place";
import { writeLastPlace } from "@/src/lib/last-place";
import { setPendingPath } from "@/src/lib/pending-path";
import { findHotelPlace, isReadOnly } from "@/src/lib/workspace";

/**
 * Hotel mode. Guards on `me`: the route's hotel must be one the person can
 * open, otherwise the landing route picks somewhere they can. A failed `me`
 * shows a retry, never a sign-out. Below this sit the tabs and the full-screen
 * desk QR, which slides up over them.
 */
export default function HotelLayout() {
  // Global, not local: replacing /(hotel)/a/x with /(hotel)/a/y keeps this layout
  // mounted and only the URL params change, so local params would go stale.
  const { organizationSlug, propertySlug } = useGlobalSearchParams<{ organizationSlug: string; propertySlug: string }>();
  const pathname = usePathname();
  const user = useCurrentUser();
  const place = findHotelPlace(user.data ?? null, organizationSlug, propertySlug);
  const placeKey = place?.key ?? null;

  useEffect(() => {
    if (placeKey && user.clerkUserId) writeLastPlace(user.clerkUserId, placeKey);
  }, [placeKey, user.clerkUserId]);

  if (user.isSignedIn === false) {
    // Sign-in resumes here; if the hotel is not theirs after all, the guard below sends them to the landing.
    setPendingPath(pathname);
    return <Redirect href="/sign-in" />;
  }
  if (!user.data) {
    if (user.isError) return <RetryScreen onRetry={() => void user.refetch()} retrying={user.isFetching} />;
    return <PendingScreen />;
  }
  if (!place) return <Redirect href="/" />;

  return (
    <HotelPlaceProvider value={place}>
      <View style={styles.root}>
        {isReadOnly(place) ? <ReadOnlyBanner status={place.subscription.status} /> : null}
        <Stack key={place.key} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="desk-qr" options={{ animation: "slide_from_bottom", gestureEnabled: true }} />
          <Stack.Screen name="reports" />
          <Stack.Screen name="details" />
          <Stack.Screen name="getting-started" />
        </Stack>
      </View>
    </HotelPlaceProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background } });
