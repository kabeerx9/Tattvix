import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "./Card";
import { colors, space, type } from "./theme";

// A label over a number, inside a Card. Never with an icon.
export function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <Card style={styles.card}>
      <Text style={[type.meta, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[type.kpiValue, styles.value]}>{String(value)}</Text>
    </Card>
  );
}

/** Three across, with the 12 gap from the design doc. */
export function KpiRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md },
  card: { flex: 1, paddingVertical: 14, paddingHorizontal: space.lg, gap: 4 },
  value: { color: colors.foreground },
});
