import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { usePressFeedback } from "./press";
import { Spinner } from "./Spinner";
import { colors, radii, type } from "./theme";

export type ButtonVariant = "primary" | "outline" | "ghost" | "destructive";

const variantStyle = {
  primary: { backgroundColor: colors.primary, borderColor: colors.primary, label: colors.primaryForeground },
  outline: { backgroundColor: colors.card, borderColor: colors.foreground, label: colors.foreground },
  ghost: { backgroundColor: colors.muted, borderColor: colors.muted, label: colors.foreground },
  destructive: { backgroundColor: "transparent", borderColor: "transparent", label: colors.destructive },
} as const;

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon,
  leading,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  /** Non-Lucide leading node, e.g. the Google mark. */
  leading?: ReactNode;
  accessibilityLabel?: string;
}) {
  const press = usePressFeedback();
  const v = variantStyle[variant];
  const inactive = disabled || loading;
  const height = size === "sm" ? 38 : 44;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View
        style={[
          styles.base,
          { height, backgroundColor: v.backgroundColor, borderColor: v.borderColor, borderRadius: radii.control },
          press.style,
        ]}
      >
        {loading ? (
          <Spinner color={v.label} />
        ) : (
          <View style={styles.inner}>
            {Icon ? <Icon color={v.label} size={18} strokeWidth={2} /> : null}
            {leading}
            <Text style={[size === "sm" ? type.buttonSm : type.button, { color: v.label }]}>{label}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", borderWidth: 1, paddingHorizontal: 16 },
  inner: { flexDirection: "row", alignItems: "center", gap: 8 },
});
