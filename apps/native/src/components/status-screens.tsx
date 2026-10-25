import { CloudOff } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { EmptyState, Screen, colors } from "@/src/design-system";

/** Shown while `me` loads on a cold start. The splash overlay usually covers it. */
export function PendingScreen() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.mutedForeground} />
    </View>
  );
}

/**
 * `me` failed, so we cannot tell what the person may open. Never sign out here:
 * a flaky network at the desk must not throw the receptionist back to the
 * password screen (decision: "single app workspace model", issue #43).
 */
export function RetryScreen({ onRetry, retrying = false }: { onRetry: () => void; retrying?: boolean }) {
  return (
    <Screen mode="fixed">
      <View style={styles.center}>
        <EmptyState icon={CloudOff} text={retrying ? "Trying again…" : "Could not reach Tattwix. Check the connection and try again."} action={{ label: "Try again", onPress: onRetry }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});
