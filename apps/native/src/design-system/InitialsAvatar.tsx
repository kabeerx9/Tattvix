import { avatarTone } from "@tattvix/api";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "./theme";

// Soft tone pairs (fill, ink); the shared avatarTone picks one per name, so a
// person keeps their colour across screens and on web.
const tones = [
  ["#e8f1fd", "#1d4f91"],
  ["#fdeee8", "#9a3412"],
  ["#eef6ec", "#2f6b2f"],
  ["#f3edfb", "#5b3b8c"],
  ["#fdf3d9", "#8a5a00"],
] as const;

// The only circle besides photo avatars: initials on the person's soft tone.
export function InitialsAvatar({ initials, name, size = 44 }: { initials: string; name?: string; size?: 40 | 44 | 72 }) {
  const [fill, ink] = tones[avatarTone(name ?? initials)];
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: fill }]} accessibilityLabel={initials}>
      <Text style={[styles.text, { color: ink, fontSize: size === 72 ? 26 : size === 44 ? 15 : 13 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center", backgroundColor: colors.muted },
  text: { fontFamily: fonts.semibold },
});
