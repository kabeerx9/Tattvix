import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { Button, type ButtonVariant } from "./Button";
import { colors, space, type } from "./theme";

// Bare muted icon, one line of what belongs here, one action. No fake data.
export function EmptyState({
  icon: Icon,
  text,
  action,
}: {
  icon: LucideIcon;
  text: string;
  action?: { label: string; onPress: () => void; variant?: ButtonVariant };
}) {
  return (
    <View style={styles.wrap}>
      <Icon color={colors.mutedForeground} size={32} strokeWidth={1.6} />
      <Text style={styles.text}>{text}</Text>
      {action ? <Button label={action.label} onPress={action.onPress} variant={action.variant ?? "outline"} size="sm" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: space.md, paddingVertical: space.xxl },
  text: { ...type.meta, color: colors.mutedForeground, textAlign: "center", maxWidth: 280 },
});
