import { Users } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { EmptyState, LargeTitle, Screen, space } from "@/src/design-system";
import { useHotelPlace } from "@/src/lib/hotel-place";

export default function GuestsScreen() {
  const place = useHotelPlace();
  return (
    <Screen>
      <LargeTitle meta={place.propertyName}>Guests</LargeTitle>
      <View style={styles.body}>
        <EmptyState icon={Users} text="Guests who have stayed here, with their visits, will appear here." />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { marginTop: space.xxxl } });
