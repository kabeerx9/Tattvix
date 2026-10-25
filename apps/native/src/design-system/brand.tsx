// The Tattwix logo for native. The mark is "Threshold" and the two paths are
// identical to apps/web/src/components/brand.tsx; keep them in sync.
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { fonts } from "./theme";

export const MARK_FRAME_PATH = "M12 56V8h40v20H40V20H24v36Z";
export const MARK_LEAF_PATH = "M40 36h12v20H40Z";

export function BrandMark({ size = 22, color = "#222222" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Tattwix">
      <Path d={MARK_FRAME_PATH} fill={color} />
      <Path d={MARK_LEAF_PATH} fill={color} />
    </Svg>
  );
}

const sizes = {
  sm: { mark: 18, text: 15, gap: 6 },
  md: { mark: 22, text: 19, gap: 8 },
  lg: { mark: 30, text: 26, gap: 10 },
} as const;

export function BrandLogo({
  size = "md",
  tone = "default",
}: {
  size?: keyof typeof sizes;
  /** `inverse` for use over a photo scrim. */
  tone?: "default" | "inverse";
}) {
  const s = sizes[size];
  const color = tone === "inverse" ? "#ffffff" : "#222222";
  return (
    <View style={[styles.row, { gap: s.gap }]}>
      <BrandMark size={s.mark} color={color} />
      <Text style={[styles.text, { fontSize: s.text, lineHeight: s.text, letterSpacing: -0.03 * s.text, color }]}>Tattwix</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  text: { fontFamily: fonts.bold },
});
