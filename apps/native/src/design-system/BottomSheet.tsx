import { useEffect, useState, type PropsWithChildren, type ReactNode } from "react";
import { Keyboard, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, motion, radii, shadows, space, type } from "./theme";

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;

// Drag-to-dismiss sheet. Enters 240ms easeDrawer, exits 180ms, with a scrim.
// Reduced motion drops the travel and keeps an opacity fade.
export function BottomSheet({
  open,
  onClose,
  title,
  footer,
  children,
}: PropsWithChildren<{ open: boolean; onClose: () => void; title?: string; footer?: ReactNode }>) {
  const reduceMotion = useReducedMotion();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  // 0 = closed, 1 = open.
  const progress = useSharedValue(0);
  // Finger travel while dragging, in px, always >= 0.
  const drag = useSharedValue(0);
  // The sheet rides above the keyboard so a field near the footer stays in view
  // (the Modal is its own window, so the usual resize does not reach it).
  const keyboard = useSharedValue(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      keyboard.value = withTiming(e.endCoordinates.height, { duration: motion.duration.enter, easing: motion.easeOut });
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      keyboard.value = withTiming(0, { duration: motion.duration.exit, easing: motion.easeOut });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboard]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      drag.value = 0;
      progress.value = withTiming(1, reduceMotion ? { duration: motion.duration.enter, easing: motion.easeOut } : { duration: motion.duration.sheet, easing: motion.easeDrawer });
    } else {
      progress.value = withTiming(0, { duration: reduceMotion ? motion.duration.exit : motion.duration.sheetExit, easing: motion.easeOut }, (finished) => {
        if (finished) scheduleOnRN(setMounted, false);
      });
    }
    // Only react to the open flag; reduceMotion is read at the moment of change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const sheetStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: progress.value, transform: [{ translateY: -keyboard.value }] };
    return { transform: [{ translateY: (1 - progress.value) * height + drag.value - keyboard.value }] };
  });

  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      drag.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (drag.value > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        drag.value = withTiming(height, { duration: motion.duration.sheetExit, easing: motion.easeOut }, (finished) => {
          if (finished) scheduleOnRN(onClose);
        });
      } else {
        drag.value = withTiming(0, { duration: motion.duration.enter, easing: motion.easeOut });
      }
    });

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {/* Modal is its own native root, so gesture handling needs a root view inside it. */}
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
          <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.md) + space.xl }, sheetStyle]}>
            <View style={styles.grab} />
            {title ? (
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
            ) : null}
            {children}
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { backgroundColor: colors.scrim },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingTop: space.sm,
    paddingHorizontal: space.xl,
    ...shadows.raised,
  },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 14 },
  title: { ...type.cardTitle, color: colors.foreground, marginBottom: 2 },
  footer: { marginTop: space.xl, gap: space.sm },
});
