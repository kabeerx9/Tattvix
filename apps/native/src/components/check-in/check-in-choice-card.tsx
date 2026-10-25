// A full-width tappable row for choosing among saved records (an ID, a
// companion). The whole row is the control. Selected = foreground outline and
// a foreground mark, never the accent.
import { Check } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, space, type } from "@/src/design-system";

export function ChoiceCard({
  kind,
  selected,
  disabled = false,
  onPress,
  title,
  description,
  leading,
  children,
}: {
  kind: "radio" | "checkbox";
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  title: string;
  description?: string;
  leading?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.card, selected && styles.selected]}>
      <Pressable
        accessibilityRole={kind}
        accessibilityState={{ checked: selected, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={styles.row}
      >
        {leading}
        <View style={styles.copy}>
          <Text style={[styles.title, disabled && styles.muted]}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        <View
          style={[
            styles.mark,
            kind === "radio" ? styles.markRadio : styles.markBox,
            selected && styles.markOn,
            disabled && styles.dim,
          ]}
        >
          {selected ? <Check color={colors.background} size={14} strokeWidth={3} /> : null}
        </View>
      </Pressable>
      {children ? <View style={styles.footer}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: "hidden" },
  selected: { borderColor: colors.foreground, borderWidth: 2 },
  row: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  copy: { flex: 1, minWidth: 0 },
  title: { ...type.rowTitle, color: colors.foreground },
  muted: { color: colors.mutedForeground },
  description: { ...type.caption, color: colors.mutedForeground, marginTop: 2 },
  mark: { width: 24, height: 24, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.input, backgroundColor: colors.card },
  markRadio: { borderRadius: 12 },
  markBox: { borderRadius: 6 },
  markOn: { borderColor: colors.foreground, backgroundColor: colors.foreground },
  dim: { opacity: 0.5 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSoft, paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm },
});
