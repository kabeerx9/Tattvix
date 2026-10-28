import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutRectangle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { colors, motion, radii, space, type } from "./theme";

export type PillTab = { key: string; label: string; count?: number };

// Horizontal, scrolling, pick-one tabs. The row bleeds to the screen edge and
// keeps the 20 gutter inside. One foreground pill slides between the tabs
// (220ms ease-in-out, the "move" token); reduced motion makes it jump.
export function PillTabs({ items, value, onChange }: { items: PillTab[]; value: string; onChange: (key: string) => void }) {
  const reduce = useReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const placed = useSharedValue(false);

  const target = layouts[value];
  useEffect(() => {
    if (!target) return;
    const animate = placed.value && !reduce;
    const config = { duration: motion.duration.move, easing: motion.easeInOut };
    x.value = animate ? withTiming(target.x, config) : target.x;
    width.value = animate ? withTiming(target.width, config) : target.width;
    placed.value = true;
  }, [target, reduce, x, width, placed]);

  const indicator = useAnimatedStyle(() => ({
    opacity: placed.value ? 1 : 0,
    width: width.value,
    transform: [{ translateX: x.value }],
  }));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.row}>
      <View style={styles.track}>
        <Animated.View pointerEvents="none" style={[styles.indicator, indicator]} />
        {items.map((item) => {
          const selected = item.key === value;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(item.key)}
              onLayout={(event) => {
                const layout = event.nativeEvent.layout;
                setLayouts((current) => (current[item.key]?.x === layout.x && current[item.key]?.width === layout.width ? current : { ...current, [item.key]: layout }));
              }}
              style={[styles.pill, selected ? styles.selected : styles.idle]}
            >
              <Text style={[type.pill, { color: selected ? colors.primaryForeground : colors.foreground }]}>{item.label}</Text>
              {item.count !== undefined ? (
                <Text style={[type.badge, styles.count, { color: selected ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>{String(item.count)}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -space.xl, marginTop: space.lg, flexGrow: 0 },
  row: { paddingHorizontal: space.xl },
  track: { flexDirection: "row", gap: space.sm },
  indicator: { position: "absolute", top: 0, left: 0, height: 36, borderRadius: radii.pill, backgroundColor: colors.foreground },
  pill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  idle: { backgroundColor: "transparent", borderColor: colors.border },
  // The sliding indicator paints the fill; the selected pill itself stays clear.
  selected: { backgroundColor: "transparent", borderColor: "transparent" },
  count: { fontVariant: ["tabular-nums"] },
});
