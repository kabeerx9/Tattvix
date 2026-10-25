import { Sun } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { EmptyState, LargeTitle, Screen, space } from "@/src/design-system";
import { useHotelPlace } from "@/src/lib/hotel-place";

// Placeholder until the desk loop lands (issue #57): arrivals, in-house, departures.
export default function TodayScreen() {
  const place = useHotelPlace();
  return (
    <Screen>
      <LargeTitle meta={place.propertyName}>Today</LargeTitle>
      <View style={styles.body}>
        <EmptyState icon={Sun} text="Arrivals, departures and who is in-house will appear here." />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { marginTop: space.xxxl } });
