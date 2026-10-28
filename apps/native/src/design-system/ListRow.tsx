import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { usePressFeedback } from "./press";
import { colors, type } from "./theme";

// The row used inside Panel and in plain lists. Whole row is the pressable.
// `compact` is the 44-tall menu row; the default is at least 56.
export function ListRow({
  title,
  detail,
  icon: Icon,
  leading,
  trailing,
  chevron = false,
  compact = false,
  titleLines = 1,
  detailLines = 2,
  detailTone = "muted",
  onPress,
}: {
  title: string;
  detail?: string;
  /** Neutral line icon, no background. */
  icon?: LucideIcon;
  /** Custom leading node such as an InitialsAvatar or a small PhotoTile. */
  leading?: ReactNode;
  /** Trailing badge, value or other node. */
  trailing?: ReactNode;
  chevron?: boolean;
  compact?: boolean;
  /** Zero lets guidance copy wrap fully instead of truncating instructions. */
  titleLines?: number;
  detailLines?: number;
  /** Destructive for a line that needs attention, such as an overdue checkout. */
  detailTone?: "muted" | "success" | "destructive";
  onPress?: () => void;
}) {
  const press = usePressFeedback();
  const body = (
    <View style={[styles.row, compact && styles.compact]}>
      {Icon ? <Icon color={colors.foreground} size={22} strokeWidth={1.6} /> : null}
      {leading}
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={titleLines}>
          {title}
        </Text>
        {detail ? (
          <Text style={[styles.detail, detailTone !== "muted" && { color: detailTone === "success" ? colors.success : colors.destructive }]} numberOfLines={detailLines}>
            {detail}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron ? <ChevronRight color={colors.subtleForeground} size={18} strokeWidth={2} /> : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={detail} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={press.style}>{body}</Animated.View>
    </Pressable>
  );
}

/** Rows inside a Panel use the same component. */
export const PanelRow = ListRow;

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, paddingVertical: 10, paddingHorizontal: 16 },
  compact: { minHeight: 44, paddingVertical: 8 },
  copy: { flex: 1, gap: 2 },
  title: { ...type.rowTitle, color: colors.foreground },
  detail: { ...type.caption, color: colors.mutedForeground },
  fact: { alignItems: "flex-start" },
  factValue: { ...type.body, color: colors.foreground },
  factEmpty: { color: colors.subtleForeground },
});

/** A read-only fact inside a Panel: small label over the value. A null value reads "Not added". */
export function FactRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={[styles.row, styles.fact]} accessible accessibilityLabel={`${label}: ${value ?? "Not added"}`}>
      <View style={styles.copy}>
        <Text style={styles.detail}>{label}</Text>
        <Text style={[styles.factValue, value === null && styles.factEmpty]}>{value ?? "Not added"}</Text>
      </View>
    </View>
  );
}
