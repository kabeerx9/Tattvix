import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function HomeRoute() {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>Development Build</Text>
        <Text style={styles.title}>Tattvix</Text>
        <Text style={styles.copy}>
          Native shell is running without auth wiring. Add the product flows here when the shape is
          settled.
        </Text>
      </View>
    </View>
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
  panel: {
    width: "100%",
    maxWidth: 420,
    gap: 12,
  },
  eyebrow: {
    color: "#1D9E75",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: "#1C1C1E",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0,
  },
  copy: {
    color: "rgba(60,60,67,0.72)",
    fontSize: 16,
    lineHeight: 23,
  },
});
