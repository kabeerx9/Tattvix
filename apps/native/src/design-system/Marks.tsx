import type { FactTone, PlaceTone } from "@tattvix/api";
import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { fonts, placeGradients, toneFills } from "./theme";

/** A white icon on a solid colour square: colour without a pale tint of its own hue. */
export function SolidIcon({ icon: Icon, tone, size = 32 }: { icon: LucideIcon; tone: FactTone; size?: number }) {
  return (
    <View style={[styles.square, { width: size, height: size, borderRadius: Math.round(size * 0.28), backgroundColor: toneFills[tone] }]}>
      <Icon color="#ffffff" size={Math.round(size * 0.53)} strokeWidth={2} />
    </View>
  );
}

/**
 * A place's mark: its initials (or an icon) on the place's own gradient, the
 * same square in the Menu and on Privacy. `dim` greys it for places that no
 * longer apply, such as a hotel whose access has ended.
 */
export function PlaceMark({ tone, initials, icon: Icon, size = 40, dim = false }: { tone: PlaceTone | "teal"; initials?: string; icon?: LucideIcon; size?: number; dim?: boolean }) {
  return (
    <LinearGradient
      colors={placeGradients[tone]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.square, { width: size, height: size, borderRadius: Math.round(size * 0.28) }, dim && styles.dim]}
    >
      {Icon ? <Icon color="#ffffff" size={Math.round(size * 0.48)} strokeWidth={1.9} /> : <Text style={[styles.initials, { fontSize: Math.round(size * 0.37) }]}>{initials}</Text>}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  square: { alignItems: "center", justifyContent: "center" },
  dim: { opacity: 0.45 },
  initials: { fontFamily: fonts.bold, color: "#ffffff", letterSpacing: -0.3 },
});
