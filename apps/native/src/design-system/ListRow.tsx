import { factTones, type FactIcon } from "@tattvix/api";
import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { factIcons } from "./fact-icons";
import { SolidIcon } from "./Marks";
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
  titleTone,
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
  detailTone?: "muted" | "success" | "warning" | "destructive";
  /** A status title, such as "Ready for check-in" in green. */
  titleTone?: "success" | "warning";
  onPress?: () => void;
}) {
  const press = usePressFeedback();
  const body = (
    <View style={[styles.row, compact && styles.compact]}>
      {Icon ? <Icon color={colors.foreground} size={22} strokeWidth={1.6} /> : null}
      {leading}
      <View style={styles.copy}>
        <Text style={[styles.title, titleTone && { color: colors[titleTone] }]} numberOfLines={titleLines}>
          {title}
        </Text>
        {detail ? (
          <Text style={[styles.detail, detailTone !== "muted" && { color: colors[detailTone] }]} numberOfLines={detailLines}>
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
  factIcon: { marginTop: 6 },
  factValue: { ...type.body, color: colors.foreground },
  factEmpty: { color: colors.subtleForeground },
  factAdd: { ...type.rowTitle, color: colors.primary },
  factChevron: { alignSelf: "center" },
});

/**
 * A fact inside a Panel: small label over the value, its icon on the fact's own colour.
 * With `onPress` the whole row edits it (chevron), and an empty value reads as the action,
 * such as "Add phone number"; without it, an empty value reads "Not added".
 */
export function FactRow({ label, value, icon, addLabel, onPress }: { label: string; value: string | null; icon?: FactIcon; addLabel?: string; onPress?: () => void }) {
  const press = usePressFeedback();
  const empty = value === null;
  const shown = empty ? (onPress && addLabel ? addLabel : "Not added") : value;
  const body = (
    <View style={[styles.row, styles.fact]}>
      {icon ? (
        <View style={styles.factIcon}>
          <SolidIcon icon={factIcons[icon]} tone={factTones[icon]} />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text style={styles.detail}>{label}</Text>
        <Text style={[styles.factValue, empty && (onPress ? styles.factAdd : styles.factEmpty)]}>{shown}</Text>
      </View>
      {onPress ? <ChevronRight color={colors.subtleForeground} size={18} strokeWidth={2} style={styles.factChevron} /> : null}
    </View>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={`${label}: ${value ?? "Not added"}`}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={empty ? (addLabel ?? `Add ${label.toLowerCase()}`) : `${label}: ${value}`}
      accessibilityHint={empty ? undefined : "Edit"}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.View style={press.style}>{body}</Animated.View>
    </Pressable>
  );
}
