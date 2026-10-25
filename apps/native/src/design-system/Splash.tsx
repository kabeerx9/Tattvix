import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { MARK_FRAME_PATH, MARK_LEAF_PATH } from "./brand";
import { colors, fonts, motion } from "./theme";

const MARK = 88;
const HOLD_UNTIL_FADE = 1500;
const FADE_OUT = 200;

// The in-app part of the splash: a white overlay over the static native splash.
// Timeline from the design doc (Motion > Splash):
//   door frame 0ms, 520ms; leaf 260ms, 460ms; word 560ms, 420ms;
//   lockup settles to 0.94 at 1000ms, 500ms; tagline 1100ms, 400ms;
//   overlay fades out 1500ms, 200ms, then onDone.
// Reduced motion: everything shown at once, then the same fade.
export function Splash({ onDone }: { onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  const start = reduceMotion ? 1 : 0;
  const frame = useSharedValue(start);
  const leaf = useSharedValue(start);
  const word = useSharedValue(start);
  const lockup = useSharedValue(start);
  const tag = useSharedValue(start);
  const overlay = useSharedValue(1);

  useEffect(() => {
    const fadeOut = (delay: number) => {
      overlay.value = withDelay(delay, withTiming(0, { duration: FADE_OUT }, (finished) => {
        if (finished) scheduleOnRN(onDone);
      }));
    };

    if (reduceMotion) {
      fadeOut(400);
      return;
    }

    const ease = { duration: 0, easing: motion.easeOut };
    frame.value = withTiming(1, { ...ease, duration: 520 });
    leaf.value = withDelay(260, withTiming(1, { ...ease, duration: 460 }));
    word.value = withDelay(560, withTiming(1, { ...ease, duration: 420 }));
    lockup.value = withDelay(1000, withTiming(1, { ...ease, duration: 500 }));
    tag.value = withDelay(1100, withTiming(1, { duration: 400, easing: motion.easeOut }));
    fadeOut(HOLD_UNTIL_FADE);
    // Runs once per mount; the Splash is remounted to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const frameStyle = useAnimatedStyle(() => ({
    opacity: frame.value,
    transform: [{ scale: 0.92 + 0.08 * frame.value }, { translateY: 6 * (1 - frame.value) }],
  }));
  const leafStyle = useAnimatedStyle(() => ({
    opacity: leaf.value,
    transform: [{ translateX: 26 * (1 - leaf.value) }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateX: -10 * (1 - word.value) }],
  }));
  const lockupStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - 0.06 * lockup.value }],
  }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tag.value }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}>
      <View style={styles.center}>
        <Animated.View style={[styles.lockup, lockupStyle]}>
          <View style={styles.mark}>
            <Animated.View style={[StyleSheet.absoluteFill, frameStyle]}>
              <Svg width={MARK} height={MARK} viewBox="0 0 64 64">
                <Path d={MARK_FRAME_PATH} fill={colors.foreground} />
              </Svg>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, leafStyle]}>
              <Svg width={MARK} height={MARK} viewBox="0 0 64 64">
                <Path d={MARK_LEAF_PATH} fill={colors.foreground} />
              </Svg>
            </Animated.View>
          </View>
          <Animated.Text style={[styles.word, wordStyle]}>Tattwix</Animated.Text>
        </Animated.View>
      </View>
      <Animated.Text style={[styles.tag, tagStyle]}>Arrive ready.</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: colors.background, zIndex: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  lockup: { flexDirection: "row", alignItems: "center" },
  mark: { width: MARK, height: MARK },
  word: { marginLeft: 14, fontFamily: fonts.bold, fontSize: 34, lineHeight: 40, letterSpacing: -1.36, color: colors.foreground },
  tag: { position: "absolute", bottom: 72, left: 0, right: 0, textAlign: "center", fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.subtleForeground },
});
