// Stays: every check-in at this property, searchable by guest name and
// filterable by status. Rows open the stay's detail.
import { getStayStatus, localDayKey, stayStatusLabel } from "@tattvix/api";
import type { HotelStayListQuery, OperationalStayStatus } from "@tattvix/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { CalendarDays } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { EmptyState, InitialsAvatar, LargeTitle, ListRow, Panel, PillTabs, Screen, StatusPill, TextField, TextLink, space } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import { getDeskScope } from "@/src/lib/desk-scope";
import { formatDay, formatTime, initialsOf, partyLabel } from "@/src/lib/format";
import { useHotelPlace } from "@/src/lib/hotel-place";

type Filter = "ALL" | OperationalStayStatus;
const filters: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING_CHECK_IN", label: "Waiting for a room" },
  { key: "CHECKED_IN", label: "Checked in" },
  { key: "CHECKED_OUT", label: "Checked out" },
];
const pillTone = { PENDING_CHECK_IN: "warning", CHECKED_IN: "success", CHECKED_OUT: "neutral" } as const;

function useDebounced(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function StaysScreen() {
  const place = useHotelPlace();
  const scope = getDeskScope(place);
  const router = useRouter();
  const { organizationSlug, propertySlug } = scope;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const debounced = useDebounced(search.trim(), 300);
  const query: HotelStayListQuery = {
    ...(debounced.length >= 2 ? { search: debounced } : {}),
    ...(filter !== "ALL" ? { operationalStatus: filter } : {}),
  };
  const stayQuery = useQuery({ ...queries.hotelStays.list(organizationSlug, propertySlug, query), placeholderData: keepPreviousData });
  const base = `/(hotel)/${organizationSlug}/${propertySlug}`;

  if (!stayQuery.data) {
    if (stayQuery.isError) return <RetryScreen onRetry={() => void stayQuery.refetch()} retrying={stayQuery.isFetching} />;
    return <PendingScreen />;
  }

  const todayKey = localDayKey(new Date());
  const stays = stayQuery.data.stays;
  const filtering = Boolean(query.search || query.operationalStatus);

  return (
    <Screen refreshing={stayQuery.isFetching && !stayQuery.isPlaceholderData && !stayQuery.isPending} onRefresh={() => void stayQuery.refetch()}>
      <LargeTitle meta={`${stays.length} ${filtering ? "matching" : ""} ${stays.length === 1 ? "stay" : "stays"}`.replace("  ", " ")} action={<TextLink label="Check-in QR" onPress={() => router.push(`${base}/desk-qr` as Href)} />}>
        Stays
      </LargeTitle>
      <View style={styles.search}>
        <TextField value={search} onChangeText={setSearch} placeholder="Search guest name" autoCapitalize="words" autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" />
      </View>
      <PillTabs items={filters.map((item) => ({ key: item.key, label: item.label }))} value={filter} onChange={(key) => setFilter(key as Filter)} />

      <View style={[styles.list, stayQuery.isPlaceholderData && { opacity: 0.6 }]}>
        {stays.length ? (
          <Panel>
            {stays.map((stay) => {
              const status = getStayStatus(stay, todayKey);
              const when =
                stay.operationalStatus === "PENDING_CHECK_IN"
                  ? `submitted ${formatTime(stay.submittedAt)}`
                  : stay.operationalStatus === "CHECKED_OUT"
                    ? `left ${formatDay(stay.checkedOutAt ? localDayKey(new Date(stay.checkedOutAt)) : null, todayKey, true)}`
                    : `due out ${formatDay(stay.expectedCheckOutDate, todayKey, true)}`;
              return (
                <ListRow
                  key={stay.id}
                  leading={<InitialsAvatar initials={initialsOf(stay.guestName)} size={40} />}
                  title={stay.guestName}
                  detail={[stay.room ? `Room ${stay.room.number}` : null, partyLabel(stay), status.tone === "danger" ? status.label : when].filter(Boolean).join(" · ")}
                  trailing={<StatusPill tone={pillTone[stay.operationalStatus]}>{stayStatusLabel(stay.operationalStatus)}</StatusPill>}
                  chevron
                  onPress={() => router.push(`${base}/stays/${stay.id}` as Href)}
                />
              );
            })}
          </Panel>
        ) : (
          <EmptyState icon={CalendarDays} text={filtering ? "No stays match this search." : "No stays yet. Guests appear here as soon as they scan your check-in QR."} action={filtering ? { label: "Clear filters", onPress: () => { setSearch(""); setFilter("ALL"); } } : undefined} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { marginTop: space.xl },
  list: { marginTop: space.xl },
});
