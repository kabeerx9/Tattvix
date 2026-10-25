import { Children, useMemo, type PropsWithChildren } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";

import { space } from "./theme";

// Horizontal scroll row that bleeds to the screen edge, keeps a 20 inset, snaps
// to each item and sizes items as a percentage of the screen content width.
export function Rail({ children, autoCols = 84, gap = space.md }: PropsWithChildren<{ autoCols?: number; gap?: number }>) {
  const { width } = useWindowDimensions();
  const contentWidth = width - space.xl * 2;
  const itemWidth = Math.round(contentWidth * (autoCols / 100));
  const itemStyle = useMemo(() => ({ width: itemWidth }), [itemWidth]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={itemWidth + gap}
      snapToAlignment="start"
      style={styles.bleed}
      contentContainerStyle={[styles.row, { gap }]}
    >
      {Children.map(children, (child) => (
        <View style={itemStyle}>{child}</View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -space.xl, marginTop: space.lg, flexGrow: 0 },
  row: { paddingHorizontal: space.xl, paddingBottom: space.md, paddingTop: 4 },
});
