import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

// A thin ring with one open quarter, spinning on the UI thread. Replaces
// ActivityIndicator, whose Material spinner clips inside our 44-tall button.
// Fast (720ms per turn): a quick spinner makes the wait feel shorter.
export function Spinner({ color, size = 18 }: { color: string; size?: number }) {
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.value = withRepeat(withTiming(360, { duration: 720, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(turn);
  }, [turn]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));

  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: color }, style]}
    />
  );
}

const styles = StyleSheet.create({
  ring: { borderWidth: 2, borderTopColor: "transparent" },
});
