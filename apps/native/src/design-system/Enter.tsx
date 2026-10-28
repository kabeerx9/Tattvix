import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { FadeIn, FadeInDown, ReduceMotion, useReducedMotion } from "react-native-reanimated";

import { motion } from "./theme";

const STAGGER = 40;

// A section that fades and rises 10px into place when its screen first mounts,
// staggered by `index`. Tab screens stay mounted, so it plays once per visit,
// not on every tab switch. Reduced motion keeps a short fade without movement.
export function Enter({ index = 0, style, children }: PropsWithChildren<{ index?: number; style?: StyleProp<ViewStyle> }>) {
  const reduce = useReducedMotion();
  const entering = reduce
    ? FadeIn.duration(motion.duration.enter).reduceMotion(ReduceMotion.Never)
    : FadeInDown.duration(320).delay(index * STAGGER).easing(motion.easeOut).withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] });
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
