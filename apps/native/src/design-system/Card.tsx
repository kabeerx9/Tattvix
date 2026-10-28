import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import { usePressFeedback } from "./press";
import { colors, radii, space } from "./theme";

// White, 1px border, card shadow, radius 16. Pass onPress to make the whole
// card the pressable (it scales on press like a Button).
export function Card({ children, style, onPress, accessibilityLabel }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }>) {
  const press = usePressFeedback();
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.card, style, press.style]}>{children}</Animated.View>
    </Pressable>
  );
}

export const cardStyle = {
  backgroundColor: colors.card,
  // On the grey canvas a hairline is enough; no shadow.
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.borderSoft,
  borderRadius: radii.card,
  padding: space.lg,
} as const;

const styles = StyleSheet.create({ card: cardStyle });
