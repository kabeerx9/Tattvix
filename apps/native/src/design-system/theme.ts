// Native design tokens. Hand-synced copy of the web tokens in
// packages/ui/src/styles/globals.css; see apps/native/docs/design-system.md.
// Light theme only: nothing here branches on the device colour scheme.
import { Easing } from "react-native-reanimated";

export const colors = {
  background: "#ffffff",
  card: "#ffffff",
  foreground: "#222222",
  mutedForeground: "#6a6a6a",
  subtleForeground: "#717171",
  border: "#dddddd",
  borderSoft: "#ebebeb",
  muted: "#f7f7f7",
  input: "#929292",
  primary: "#d70f58",
  primaryHover: "#b00c49",
  primaryForeground: "#ffffff",
  success: "#067647",
  successTint: "#ecfdf3",
  warning: "#b54708",
  warningTint: "#fef4e6",
  destructive: "#b42318",
  destructiveTint: "#feeceb",
  scrim: "rgba(0,0,0,0.35)",
} as const;

// The stay key card (hotel stay detail): the brand rose deepened to aubergine,
// with solid status fills that read on it. Web mirrors these in stay-key-card.tsx.
export const keyCard = {
  gradient: ["#8c1340", "#4a0d29", "#250716"] as const,
  // The same plum as one flat colour, for bars and dots (Rooms summary).
  board: "#6b0f35",
  success: "#12924f",
  warning: "#d97706",
  danger: "#dc2626",
} as const;

// The guest's stay key card: deep teal with a gold chip, so a guest's card
// never looks like the hotel's plum ones.
export const guestCard = {
  gradient: ["#13615f", "#0a3b3b", "#052222"] as const,
  chip: ["#e9c98a", "#b98d43"] as const,
  stripe: "#021414",
} as const;

export const radii = {
  card: 16,
  sheet: 20,
  control: 10,
  photo: 12,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  raised: {
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;

// Inter via @expo-google-fonts/inter. One family per weight: custom families
// do not combine with fontWeight reliably on Android, so weight lives in the name.
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const type = {
  hero: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  largeTitle: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  pageTitle: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 28, letterSpacing: -0.5 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 26, letterSpacing: -0.3 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22, letterSpacing: -0.2 },
  headerTitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: 0 },
  rowTitle: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, letterSpacing: 0 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  meta: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  label: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  kpiValue: { fontFamily: fonts.semibold, fontSize: 26, lineHeight: 30, letterSpacing: -0.5, fontVariant: ["tabular-nums"] as const },
  button: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, letterSpacing: 0 },
  buttonSm: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, letterSpacing: 0 },
  pill: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18, letterSpacing: 0 },
  badge: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  tab: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0 },
  tabActive: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0 },
} as const;

// 4-point scale. The screen gutter is `xl` (20).
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 36,
} as const;

export const motion = {
  easeOut: Easing.bezier(0.23, 1, 0.32, 1),
  easeInOut: Easing.bezier(0.77, 0, 0.175, 1),
  easeDrawer: Easing.bezier(0.32, 0.72, 0, 1),
  duration: {
    press: 140,
    enter: 200,
    exit: 140,
    move: 220,
    sheet: 240,
    sheetExit: 180,
  },
} as const;

// Kept as a hook so call sites read the same way on every screen. It is not
// scheme-aware: the app is light-only.
export function useAppTheme() {
  return { colors, radii, space, type } as const;
}
