import { useAuth } from "@clerk/clerk-expo";
import { StyleSheet, View } from "react-native";

import { PlaceSwitcherRows } from "@/src/components/PlaceSwitcher";
import { LargeTitle, Screen, space } from "@/src/design-system";

// The Menu tab opens the switcher sheet; this screen backs the route itself.
export default function GuestMenuScreen() {
  const { signOut } = useAuth();
  return (
    <Screen>
      <LargeTitle>Menu</LargeTitle>
      <View style={styles.body}>
        <PlaceSwitcherRows current={{ kind: "guest" }} onSignOut={() => void signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { marginTop: space.xxl } });
