import { StyleSheet, Text, View, type ColorValue } from "react-native";

import { colors, radii, type } from "./theme";

const tones = {
  neutral: { backgroundColor: colors.borderSoft, color: colors.foreground },
  success: { backgroundColor: colors.successTint, color: colors.success },
  warning: { backgroundColor: colors.warningTint, color: colors.warning },
  destructive: { backgroundColor: colors.destructiveTint, color: colors.destructive },
  // Over a photo: a solid white chip so the status reads on any image.
  onPhoto: { backgroundColor: "#ffffff", color: colors.success },
} as const satisfies Record<string, { backgroundColor: ColorValue; color: ColorValue }>;

export function StatusPill({ tone = "neutral", children }: { tone?: keyof typeof tones; children: string }) {
  const t = tones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.backgroundColor }]}>
      <Text style={[type.badge, { color: t.color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: "flex-start", borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 3 },
});
