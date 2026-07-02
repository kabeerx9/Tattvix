import { Stack, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.title}>Not found</Text>
          <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.replace("/")}>
            <Text style={styles.buttonText}>Home</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAF8",
    padding: 24,
  },
  content: {
    alignItems: "center",
    gap: 16,
  },
  title: {
    color: "#1C1C1E",
    fontSize: 20,
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#1C1C1E",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
