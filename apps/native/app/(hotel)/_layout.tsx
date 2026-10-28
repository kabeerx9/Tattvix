import { Stack } from "expo-router";

import { colors } from "@/src/design-system";

export default function HotelGroupLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />;
}
