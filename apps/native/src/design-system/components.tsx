import type { PropsWithChildren, ReactNode } from "react";
import type { LucideIcon } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, type TextInputProps, View, type StyleProp, type ViewStyle } from "react-native";

import { useAppTheme } from "./theme";

export function Screen({ children }: PropsWithChildren) {
  const { colors } = useAppTheme();
  return <View style={[styles.screen, { backgroundColor: colors.background }]}>{children}</View>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { colors } = useAppTheme();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  const { colors } = useAppTheme();
  return <View style={styles.header}><View style={styles.headerCopy}><Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text><Text style={[styles.title, { color: colors.foreground }]}>{title}</Text><Text style={[styles.description, { color: colors.mutedForeground }]}>{description}</Text></View>{action}</View>;
}

export function IconTile({ symbol, icon: Icon }: { symbol?: string; icon?: LucideIcon }) {
  const { colors } = useAppTheme();
  return <View style={[styles.iconTile, { backgroundColor: colors.accent }]}>{Icon ? <Icon color={colors.accentForeground} size={20} strokeWidth={2} /> : <Text style={[styles.iconSymbol, { color: colors.accentForeground }]}>{symbol}</Text>}</View>;
}

export function AppButton({ label, onPress, variant = "primary", loading = false, disabled = false }: { label: string; onPress: () => void; variant?: "primary" | "outline" | "ghost"; loading?: boolean; disabled?: boolean }) {
  const { colors } = useAppTheme();
  const backgroundColor = variant === "primary" ? colors.primary : variant === "outline" ? colors.card : "transparent";
  const color = variant === "primary" ? colors.primaryForeground : colors.foreground;
  return <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor, borderColor: variant === "outline" ? colors.border : "transparent", opacity: pressed || disabled ? 0.66 : 1 }]}>{loading ? <ActivityIndicator color={color} /> : <Text style={[styles.buttonLabel, { color }]}>{label}</Text>}</Pressable>;
}

export function AppInput(props: TextInputProps) {
  const { colors } = useAppTheme();
  return <TextInput placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} {...props} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 18, shadowColor: "#171520", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 2 },
  header: { gap: 16 }, headerCopy: { gap: 7 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase" },
  title: { fontSize: 32, fontWeight: "700", letterSpacing: -1.1, lineHeight: 38 },
  description: { maxWidth: 560, fontSize: 14, lineHeight: 21 },
  iconTile: { alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 13 },
  iconSymbol: { fontSize: 18, fontWeight: "700" },
  button: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 18 },
  buttonLabel: { fontSize: 15, fontWeight: "700" },
  input: { minHeight: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 15, fontSize: 15 },
});
