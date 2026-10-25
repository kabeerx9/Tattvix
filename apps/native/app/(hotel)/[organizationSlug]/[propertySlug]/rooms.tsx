import { BedDouble } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { EmptyState, LargeTitle, Screen, space } from "@/src/design-system";
import { useHotelPlace } from "@/src/lib/hotel-place";

export default function RoomsScreen() {
  const place = useHotelPlace();
  return (
    <Screen>
      <LargeTitle meta={place.propertyName}>Rooms</LargeTitle>
      <View style={styles.body}>
        <EmptyState icon={BedDouble} text="Room status and rates will appear here." />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { marginTop: space.xxxl } });
