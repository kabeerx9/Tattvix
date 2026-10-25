import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii } from "./theme";

// 4:3 photo with a bottom scrim (transparent to 45% black, the only gradient in
// the kit) and a white label. With no uri it is a muted block.
export function PhotoTile({ uri, label, width }: { uri?: string | null; label?: string; width?: number | string }) {
  return (
    <View style={[styles.tile, { width: width ?? "100%" }]}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      {label ? (
        <>
          <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.45)"]} locations={[0.55, 1]} style={StyleSheet.absoluteFill} />
          <Text style={styles.label}>{label}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { aspectRatio: 4 / 3, borderRadius: radii.photo, backgroundColor: colors.muted, overflow: "hidden" },
  label: { position: "absolute", left: 12, bottom: 10, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: "#ffffff" },
});
