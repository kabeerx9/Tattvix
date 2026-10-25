import { ArrowLeft } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, type } from "./theme";

// Secondary screens: 48 tall, round 40 back target on the left, centred 17/600
// title. No large title on these screens.
export function SecondaryHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={onBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <ArrowLeft color={colors.foreground} size={22} strokeWidth={2} />
      </Pressable>
      <Text accessibilityRole="header" numberOfLines={1} style={[type.headerTitle, styles.title]}>
        {title}
      </Text>
      <View style={styles.balance} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", height: 48, marginHorizontal: -8 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  pressed: { backgroundColor: colors.muted },
  title: { flex: 1, textAlign: "center", color: colors.foreground },
  balance: { width: 40 },
});
