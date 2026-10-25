import { useAuth } from "@clerk/clerk-expo";
import { StyleSheet, View } from "react-native";

import { PlaceSwitcherRows } from "@/src/components/PlaceSwitcher";
import { LargeTitle, Screen, space } from "@/src/design-system";
import { useHotelPlace } from "@/src/lib/hotel-place";

// The Menu tab normally opens the switcher sheet without navigating here; this
// screen exists for the route itself (a deep link or a restored state).
export default function MenuScreen() {
  const place = useHotelPlace();
  const { signOut } = useAuth();
  return (
    <Screen>
      <LargeTitle>Menu</LargeTitle>
      <View style={styles.body}>
        <PlaceSwitcherRows current={{ kind: "hotel", key: place.key }} onSignOut={() => void signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { marginTop: space.xxl } });
