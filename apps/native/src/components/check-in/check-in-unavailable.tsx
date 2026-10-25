// Shown when the check-in token is gone (404) or the context cannot load.
// Copy matches the web's CheckInUnavailablePage.
import { QrCode } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { Button, colors, space, type } from "@/src/design-system";

import { CheckInBrandBar, CheckInScaffold } from "./check-in-layout";

export function CheckInUnavailable({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <CheckInScaffold header={<CheckInBrandBar />} footer={<Button label={actionLabel} variant="outline" onPress={onAction} />}>
      <View style={styles.center}>
        <QrCode color={colors.mutedForeground} size={28} strokeWidth={1.5} />
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </CheckInScaffold>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", gap: space.md, paddingTop: space.xxxl },
  title: { ...type.pageTitle, color: colors.foreground, textAlign: "center" },
  description: { ...type.body, color: colors.mutedForeground, textAlign: "center", maxWidth: 320 },
});
