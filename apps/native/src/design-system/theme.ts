import { useColorScheme } from "react-native";

export const lightColors = {
  background: "#F4F3EF",
  foreground: "#252823",
  card: "#FEFDF9",
  muted: "#ECECE6",
  mutedForeground: "#73786F",
  primary: "#405B49",
  primaryForeground: "#FFFFFF",
  accent: "#E2E9E1",
  accentForeground: "#344D3D",
  border: "#DDDCD4",
  destructive: "#C43D45",
  success: "#168566",
} as const;

export const darkColors = {
  background: "#1C201C",
  foreground: "#F7F6FA",
  card: "#252A25",
  muted: "#303630",
  mutedForeground: "#A8AEA5",
  primary: "#A3BCA8",
  primaryForeground: "#1D271F",
  accent: "#334238",
  accentForeground: "#D4E3D6",
  border: "#3A403A",
  destructive: "#FF8C93",
  success: "#72D6B6",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radii = { control: 12, card: 18, hero: 24, pill: 999 } as const;

export function useAppTheme() {
  const scheme = useColorScheme();
  return { colors: scheme === "dark" ? darkColors : lightColors, isDark: scheme === "dark", spacing, radii };
}
