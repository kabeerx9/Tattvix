import { CalendarDays } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { EmptyState, LargeTitle, Screen, space } from "@/src/design-system";

// Placeholder until guest mode lands (issue #59).
export default function GuestStaysScreen() {
  return (
    <Screen>
      <LargeTitle meta="Past and upcoming stays, with check-in details.">My stays</LargeTitle>
      <View style={styles.body}>
        <EmptyState icon={CalendarDays} text="Stays you check in to will appear here." />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { marginTop: space.xxxl } });
