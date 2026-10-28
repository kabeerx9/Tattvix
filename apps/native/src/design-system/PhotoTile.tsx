import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii } from "./theme";

// 4:3 photo with a bottom scrim (transparent to 45% black, the only gradient in
// the kit) and a white label. Photos fade in over 200ms and are cached. With no
// uri, or one that fails to load (an expired signed URL), it is a quiet muted
// block: never an icon or the logo; large tiles pass `emptyText` to say
// "No photo yet". `badge` sits in the top-left corner.
export function PhotoTile({ uri, label, width, badge, emptyText = false, aspectRatio = 4 / 3, radius = radii.photo }: { uri?: string | null; label?: string; width?: number | `${number}%`; badge?: ReactNode; emptyText?: boolean; aspectRatio?: number; radius?: number }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showPhoto = uri && uri !== failedUri;
  return (
    <View style={[styles.tile, { width: width ?? "100%", aspectRatio, borderRadius: radius }]}>
      {showPhoto ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} onError={() => setFailedUri(uri)} accessible={false} /> : null}
      {label ? (
        <>
          <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.45)"]} locations={[0.55, 1]} style={StyleSheet.absoluteFill} />
          <Text style={styles.label}>{label}</Text>
        </>
      ) : null}
      {!showPhoto && !label && emptyText ? <Text style={styles.empty}>No photo yet</Text> : null}
      {badge ? <View style={styles.badge}>{badge}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: colors.muted, overflow: "hidden", justifyContent: "center", alignItems: "center" },
  label: { position: "absolute", left: 12, bottom: 10, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: "#ffffff" },
  empty: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.subtleForeground },
  badge: { position: "absolute", left: 10, top: 10 },
});
