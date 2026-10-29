import { X } from "lucide-react-native";
import { useEffect, useState, type PropsWithChildren, type ReactNode } from "react";
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, motion, radii, shadows, space, type } from "./theme";

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;
// Room kept between the status bar and a sheet's top edge, so it still reads as a sheet.
const TOP_GAP = 24;

// Drag-to-dismiss sheet. Enters 240ms easeDrawer, exits 180ms, with a scrim.
// Reduced motion drops the travel and keeps an opacity fade.
//
// The sheet never grows past the room above the keyboard: its body scrolls
// and the footer stays pinned. `fill` takes that whole room, for long forms,
// and adds a close button. A body that renders its own list passes
// `scroll={false}` and lets that list shrink (flexShrink: 1).
export function BottomSheet({
  open,
  onClose,
  title,
  footer,
  dragHandleOnly = false,
  fill = false,
  scroll = true,
  children,
}: PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title?: string;
  footer?: ReactNode;
  dragHandleOnly?: boolean;
  fill?: boolean;
  scroll?: boolean;
}>) {
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
  // Whole-sheet dragging would swallow the body's scroll, so it only runs while the body fits.
  const [overflowing, setOverflowing] = useState(false);
  const [viewport, setViewport] = useState(0);
  const [content, setContent] = useState(0);
  useEffect(() => setOverflowing(content > viewport + 1), [content, viewport]);

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

  const topLimit = insets.top + (fill ? space.sm : TOP_GAP);
  const sheetStyle = useAnimatedStyle(() => {
    const room = Math.max(0, height - topLimit - keyboard.value);
    const size = fill ? { height: room } : { maxHeight: room };
    if (reduceMotion) return { ...size, opacity: progress.value, transform: [{ translateY: -keyboard.value }] };
    return { ...size, transform: [{ translateY: (1 - progress.value) * height + drag.value - keyboard.value }] };
  });

  const makePan = () => Gesture.Pan()
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
  const handleOnly = dragHandleOnly || fill || overflowing;

  const header = (
    <View style={handleOnly ? { paddingBottom: space.sm } : undefined}>
      <View style={styles.grab} />
      {fill ? (
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={[styles.title, styles.titleFill]}>
            {title}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={onClose} style={styles.close}>
            <X color={colors.foreground} size={22} strokeWidth={2} />
          </Pressable>
        </View>
      ) : title ? (
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      ) : null}
    </View>
  );
  const body = scroll ? (
    <ScrollView
      style={[styles.body, fill && styles.bodyFill]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
      onLayout={(e) => setViewport(e.nativeEvent.layout.height)}
      onContentSizeChange={(_, h) => setContent(h)}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.body, fill && styles.bodyFill]}>{children}</View>
  );
  const sheet = (
    <Animated.View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.md) + space.xl }, sheetStyle]}>
      {handleOnly ? <GestureDetector gesture={makePan()}>{header}</GestureDetector> : header}
      {body}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Animated.View>
  );
  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {/* Modal is its own native root, so gesture handling needs a root view inside it. */}
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
          <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        {/* A body that scrolls owns its drag gestures, so the sheet then drags
            from its header only; a body that fits keeps whole-sheet dragging. */}
        {handleOnly ? sheet : <GestureDetector gesture={makePan()}>{sheet}</GestureDetector>}
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
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  titleFill: { flex: 1, marginBottom: 0 },
  close: { padding: space.xs },
  // Shrinks to the room left between the header and the pinned footer.
  body: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  bodyFill: { flexGrow: 1 },
  footer: { marginTop: space.xl, gap: space.sm },
});
