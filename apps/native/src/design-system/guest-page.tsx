import type { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";

import { PageHeader, Screen } from "./components";

export function GuestPage({ eyebrow, title, description, children }: PropsWithChildren<{ eyebrow: string; title: string; description: string }>) {
  return <Screen><SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><PageHeader eyebrow={eyebrow} title={title} description={description} /><View style={styles.body}>{children}</View></ScrollView></SafeAreaView></Screen>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: 20, paddingTop: 28, paddingBottom: 40 }, body: { gap: 14, marginTop: 28 } });
