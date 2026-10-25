import type { Tabs } from "expo-router";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { colors, motion, space, type } from "./theme";

// The props expo-router passes to a `tabBar` renderer (BottomTabBarProps), read
// off the Tabs component so no deep import into expo-router is needed.
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const TICK_WIDTH = 32;

// Custom tab bar for expo-router Tabs (`tabBar={(props) => <TabBar {...props} />}`).
// Icons come from each screen's `tabBarIcon` option. A 32x3 rose tick slides
// along the top edge; reduced motion snaps it and fades it in instead.
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const itemWidth = state.routes.length ? width / state.routes.length : 0;
  const tickX = useSharedValue(0);
  const tickOpacity = useSharedValue(1);
  const settled = useRef(false);

  useEffect(() => {
    if (!itemWidth) return;
    const target = itemWidth * state.index + (itemWidth - TICK_WIDTH) / 2;
    if (!settled.current) {
      tickX.value = target;
      settled.current = true;
      return;
    }
    if (reduceMotion) {
      tickX.value = target;
      tickOpacity.value = 0;
      tickOpacity.value = withTiming(1, { duration: motion.duration.exit, easing: motion.easeOut });
      return;
    }
    tickX.value = withTiming(target, { duration: motion.duration.move, easing: motion.easeInOut });
  }, [itemWidth, state.index, reduceMotion, tickX, tickOpacity]);

  const tickStyle = useAnimatedStyle(() => ({
    opacity: tickOpacity.value,
    transform: [{ translateX: tickX.value }],
  }));

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.md) }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View pointerEvents="none" style={[styles.tick, tickStyle]} />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const label = options.title ?? route.name;
        const color = focused ? colors.foreground : colors.mutedForeground;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigateToTab(route.key);
            }}
            onLongPress={() => emitter.emit({ type: "tabLongPress", target: route.key })}
            style={styles.item}
          >
            {options.tabBarIcon?.({ focused, color, size: 24 })}
            <Text style={[focused ? type.tabActive : type.tab, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  item: { flex: 1, alignItems: "center", gap: 4, paddingTop: space.sm },
  tick: {
    position: "absolute",
    top: 0,
    left: 0,
    width: TICK_WIDTH,
    height: 3,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    backgroundColor: colors.primary,
  },
});
