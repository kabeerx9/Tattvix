import { CalendarDays } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { EmptyState, LargeTitle, Screen, space } from "@/src/design-system";
import { useHotelPlace } from "@/src/lib/hotel-place";

export default function StaysScreen() {
  const place = useHotelPlace();
  return (
    <Screen>
      <LargeTitle meta={place.propertyName}>Stays</LargeTitle>
      <View style={styles.body}>
        <EmptyState icon={CalendarDays} text="Every stay at this property, searchable by guest and date, will appear here." />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { marginTop: space.xxxl } });
