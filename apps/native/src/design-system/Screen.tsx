import type { PropsWithChildren } from "react";
import { RefreshControl, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, space } from "./theme";

// The tab bar is part of the Tabs layout, so content never sits under it;
// the bottom padding only keeps the last row off the edge. Pass `onRefresh`
// for pull-to-refresh on data screens. A focused field scrolls above the keyboard.
export function Screen({
  children,
  mode = "scroll",
  style,
  refreshing = false,
  onRefresh,
}: PropsWithChildren<{ mode?: "scroll" | "fixed"; style?: StyleProp<ViewStyle>; refreshing?: boolean; onRefresh?: () => void }>) {
  if (mode === "fixed") {
    return (
      <SafeAreaView edges={["top"]} style={[styles.root, style]}>
        <View style={styles.fixed}>{children}</View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView edges={["top"]} style={[styles.root, style]}>
      <KeyboardAwareScrollView
        bottomOffset={space.xl}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.mutedForeground} colors={[colors.foreground]} /> : undefined}
      >
        {children}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fixed: { flex: 1, paddingHorizontal: space.xl, paddingBottom: space.xxxl },
  content: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xxxl },
});
