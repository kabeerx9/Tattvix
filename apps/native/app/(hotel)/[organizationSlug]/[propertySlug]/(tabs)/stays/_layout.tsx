import { Stack } from "expo-router";

import { colors } from "@/src/design-system";

// The Stays tab holds its own stack: the list, then a stay's detail on top.
export default function StaysStackLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />;
}
