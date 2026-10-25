import { useCallback } from "react";
import { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { motion } from "./theme";

// Press feedback shared by Button, pressable Card and ListRow: scale to 0.97
// over 140ms. Reduced motion swaps the scale for an opacity dip.
// Only transform and opacity animate, on the UI thread.
export function usePressFeedback() {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const style = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 1 - pressed.value * 0.2 };
    return { transform: [{ scale: 1 - pressed.value * 0.03 }] };
  });

  const onPressIn = useCallback(() => {
    pressed.value = withTiming(1, { duration: motion.duration.press, easing: motion.easeOut });
  }, [pressed]);

  const onPressOut = useCallback(() => {
    pressed.value = withTiming(0, { duration: motion.duration.press, easing: motion.easeOut });
  }, [pressed]);

  return { style, onPressIn, onPressOut };
}
