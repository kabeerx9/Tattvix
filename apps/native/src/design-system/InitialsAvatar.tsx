import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "./theme";

// The only circle besides photo avatars. Muted fill, 600 initials.
export function InitialsAvatar({ initials, size = 44 }: { initials: string; size?: 40 | 44 }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]} accessibilityLabel={initials}>
      <Text style={[styles.text, { fontSize: size === 44 ? 15 : 13 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center", backgroundColor: colors.muted },
  text: { fontFamily: fonts.semibold, color: colors.foreground },
});
