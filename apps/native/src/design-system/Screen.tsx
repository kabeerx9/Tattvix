import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, space } from "./theme";

// The tab bar is part of the Tabs layout, so content never sits under it;
// the bottom padding only keeps the last row off the edge.
export function Screen({
  children,
  mode = "scroll",
  style,
}: PropsWithChildren<{ mode?: "scroll" | "fixed"; style?: StyleProp<ViewStyle> }>) {
  if (mode === "fixed") {
    return (
      <SafeAreaView edges={["top"]} style={[styles.root, style]}>
        <View style={styles.fixed}>{children}</View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView edges={["top"]} style={[styles.root, style]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fixed: { flex: 1, paddingHorizontal: space.xl, paddingBottom: space.xxxl },
  content: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xxxl },
});
