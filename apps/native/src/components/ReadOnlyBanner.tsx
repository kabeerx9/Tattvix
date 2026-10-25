import { StyleSheet, Text, View } from "react-native";

import { colors, space, type } from "@/src/design-system";

// Shown across hotel mode when the subscription has lapsed: writes are paused
// except checkout (decision: "hotel-mode scope", issue #44). Muted fill with
// warning text only; status colours never tint a panel.
export function ReadOnlyBanner({ status }: { status: "EXPIRED" | "MISSING" | "TRIALING" | "PAID" }) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.label}>{status === "MISSING" ? "No subscription" : "Trial ended"}</Text>
      <Text style={styles.message}>Check-ins and changes are paused. Contact Tattwix to continue.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.muted, paddingHorizontal: space.xl, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  label: { ...type.label, color: colors.warning },
  message: { ...type.caption, color: colors.mutedForeground, marginTop: 2 },
});
