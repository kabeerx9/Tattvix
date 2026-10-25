import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, motion, radii, shadows, space, type } from "./theme";

// One toast at a time, from anywhere: `toast("Room 101 is ready")`. A dark
// pill rises from the bottom (200ms easeOut), holds 2.4s, drops back (140ms).
// Rendered once by <Toaster /> in the root layout, above every navigator.
type Listener = (message: string) => void;
let listener: Listener | null = null;

export function toast(message: string) {
  listener?.(message);
}

const HOLD_MS = 2400;

export function Toaster() {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [message, setMessage] = useState<string | null>(null);
  const progress = useSharedValue(0);

  useEffect(() => {
    listener = setMessage;
    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    progress.value = withTiming(1, { duration: motion.duration.enter, easing: motion.easeOut });
    const timer = setTimeout(() => {
      progress.value = withTiming(0, { duration: motion.duration.exit, easing: motion.easeOut });
      setTimeout(() => setMessage((current) => (current === message ? null : current)), motion.duration.exit);
    }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [message, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - progress.value) * 24 }],
  }));

  if (!message) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { bottom: Math.max(insets.bottom, space.md) + 72 }, style]}
    >
      <Text style={styles.text} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: space.xl,
    right: space.xl,
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: space.lg,
    paddingVertical: 12,
    borderRadius: radii.control,
    backgroundColor: colors.foreground,
    ...shadows.raised,
  },
  text: { ...type.rowTitle, color: colors.primaryForeground, textAlign: "center" },
});
