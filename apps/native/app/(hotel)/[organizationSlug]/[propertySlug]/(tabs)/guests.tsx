// Guests: who is in the building now and who has stayed before, searchable by
// name on the phone. Rows open the stay.
import type { HotelGuestStay } from "@tattvix/contracts";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { History, UserRound } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { EmptyState, InitialsAvatar, LargeTitle, ListRow, Panel, Screen, SectionTitle, StatusPill, TextField, space } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import { formatDateTime, initialsOf } from "@/src/lib/format";
import { useHotelPlace } from "@/src/lib/hotel-place";

export default function GuestsScreen() {
  const place = useHotelPlace();
  const router = useRouter();
  const { organizationSlug, propertySlug } = place;
  const guestQuery = useQuery(queries.hotelOperations.guests(organizationSlug, propertySlug));
  const [search, setSearch] = useState("");

  if (!guestQuery.data) {
    if (guestQuery.isError) return <RetryScreen onRetry={() => void guestQuery.refetch()} retrying={guestQuery.isFetching} />;
    return <PendingScreen />;
  }

  const needle = search.trim().toLowerCase();
  const matches = (stay: HotelGuestStay) => !needle || stay.guestName.toLowerCase().includes(needle);
  const current = guestQuery.data.current.filter(matches);
  const history = guestQuery.data.history.filter(matches);
  const open = (stay: HotelGuestStay) => router.push(`/(hotel)/${organizationSlug}/${propertySlug}/stays/${stay.id}` as Href);

  const row = (stay: HotelGuestStay) => {
    const inHouse = stay.operationalStatus === "CHECKED_IN";
    const when = inHouse ? stay.checkedInAt : stay.checkedOutAt;
    return (
      <ListRow
        key={stay.id}
        leading={<InitialsAvatar initials={initialsOf(stay.guestName)} size={40} />}
        title={stay.guestName}
        detail={[stay.room ? `Room ${stay.room.number}` : null, stay.companionCount ? `+${stay.companionCount}` : null, `${inHouse ? "Checked in" : "Checked out"} ${formatDateTime(when)}`].filter(Boolean).join(" · ")}
        trailing={<StatusPill tone={inHouse ? "success" : "neutral"}>{inHouse ? "In house" : "Past"}</StatusPill>}
        chevron
        onPress={() => open(stay)}
      />
    );
  };

  return (
    <Screen refreshing={guestQuery.isFetching && !guestQuery.isPending} onRefresh={() => void guestQuery.refetch()}>
      <LargeTitle meta={`${guestQuery.data.current.length} in house · ${guestQuery.data.history.length} past ${guestQuery.data.history.length === 1 ? "stay" : "stays"}`}>Guests</LargeTitle>
      <View style={styles.search}>
        <TextField value={search} onChangeText={setSearch} placeholder="Search guest name" autoCapitalize="words" autoCorrect={false} returnKeyType="search" />
      </View>

      <View style={styles.section}>
        <SectionTitle meta={`${current.length}`}>Current guests</SectionTitle>
        <View style={styles.body}>{current.length ? <Panel>{current.map(row)}</Panel> : <EmptyState icon={UserRound} text={needle ? "No current guest matches." : "No guests are checked in right now."} />}</View>
      </View>

      <View style={styles.section}>
        <SectionTitle meta={`${history.length}`}>Stay history</SectionTitle>
        <View style={styles.body}>{history.length ? <Panel>{history.map(row)}</Panel> : <EmptyState icon={History} text={needle ? "No past guest matches." : "Completed stays appear here after checkout."} />}</View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { marginTop: space.xl },
  section: { marginTop: space.xxxl },
  body: { marginTop: space.lg },
});
