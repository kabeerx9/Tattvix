import type { LucideIcon } from "lucide-react-native";
import type { ColorValue } from "react-native";

// Neutral line icons for the tab bar: stroke 1.6 idle, 2.1 active, never a fill.
export function tabIcon(Icon: LucideIcon) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon color={color as string} size={24} strokeWidth={focused ? 2.1 : 1.6} />;
  };
}
