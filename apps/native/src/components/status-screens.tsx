import { describeLoadFailure } from "@tattvix/api";
import { useRouter } from "expo-router";
import { CloudOff, FileX } from "lucide-react-native";
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
 * A screen's data failed to load. Never sign out here: a flaky network at the
 * desk must not throw the receptionist back to the password screen (decision:
 * "single app workspace model", issue #43). Pass the query error so a record
 * that no longer exists (404) or is no longer ours (403) says so and offers
 * "Go back" instead of blaming the connection.
 */
export function RetryScreen({ onRetry, retrying = false, error }: { onRetry: () => void; retrying?: boolean; error?: unknown }) {
  const router = useRouter();
  const failure = error === undefined ? null : describeLoadFailure(error);
  if (failure?.action === "back") {
    return (
      <Screen mode="fixed">
        <View style={styles.center}>
          <EmptyState icon={FileX} text={failure.message} action={{ label: "Go back", onPress: () => (router.canGoBack() ? router.back() : router.replace("/")) }} />
        </View>
      </Screen>
    );
  }
  const message = failure?.message ?? "Could not reach Tattwix. Check the connection and try again.";
  return (
    <Screen mode="fixed">
      <View style={styles.center}>
        <EmptyState icon={CloudOff} text={retrying ? "Trying again…" : message} action={{ label: "Try again", onPress: onRetry }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas },
});
