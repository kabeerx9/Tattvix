import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radii, space, type } from "./theme";

export type PillTab = { key: string; label: string; count?: number };

// Horizontal, scrolling, pick-one tabs. The row bleeds to the screen edge and
// keeps the 20 gutter inside. Selected = foreground fill with white text.
export function PillTabs({ items, value, onChange }: { items: PillTab[]; value: string; onChange: (key: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.row}>
      {items.map((item) => {
        const selected = item.key === value;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(item.key)}
            style={[styles.pill, selected ? styles.selected : styles.idle]}
          >
            <Text style={[type.pill, { color: selected ? colors.primaryForeground : colors.foreground }]}>{item.label}</Text>
            {item.count !== undefined ? (
              <Text style={[type.badge, styles.count, { color: selected ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>{String(item.count)}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -space.xl, marginTop: space.lg, flexGrow: 0 },
  row: { flexDirection: "row", gap: space.sm, paddingHorizontal: space.xl },
  pill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  idle: { backgroundColor: colors.card, borderColor: colors.border },
  selected: { backgroundColor: colors.foreground, borderColor: colors.foreground },
  count: { fontVariant: ["tabular-nums"] },
});
