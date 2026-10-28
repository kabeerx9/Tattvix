// Stays: guests in house as a wallet of room key cards, guests waiting for a
// room, and past stays; a search shows matching stays as a plain list. Every
// card and row opens the stay's detail.
import { getStayStatus, getStayWallet, localDayKey, stayStatusLabel } from "@tattvix/api";
import type { HotelStayListItem, HotelStayListQuery } from "@tattvix/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { CalendarDays, KeyRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { StayWallet } from "@/src/components/stay-wallet";
import { EmptyState, GroupTitle, InitialsAvatar, LargeTitle, ListRow, Panel, Screen, StatusPill, TextField, TextLink, colors, space } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import { getDeskScope } from "@/src/lib/desk-scope";
import { formatDay, formatTime, initialsOf, partyLabel } from "@/src/lib/format";
import { useHotelPlace } from "@/src/lib/hotel-place";

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
  const debounced = useDebounced(search.trim(), 300);
  const query: HotelStayListQuery = debounced.length >= 2 ? { search: debounced } : {};
  const stayQuery = useQuery({ ...queries.hotelStays.list(organizationSlug, propertySlug, query), placeholderData: keepPreviousData });
  const base = `/(hotel)/${organizationSlug}/${propertySlug}`;

  if (!stayQuery.data) {
    if (stayQuery.isError) return <RetryScreen onRetry={() => void stayQuery.refetch()} retrying={stayQuery.isFetching} error={stayQuery.error} />;
    return <PendingScreen />;
  }

  const todayKey = localDayKey(new Date());
  const stays = stayQuery.data.stays;
  const searching = Boolean(query.search);
  const wallet = getStayWallet(stays, todayKey);
  const open = (stayId: string) => router.push(`${base}/stays/${stayId}` as Href);

  function rows(list: HotelStayListItem[]) {
    return (
      <Panel>
        {list.map((stay) => {
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
              leading={<InitialsAvatar initials={initialsOf(stay.guestName)} name={stay.guestName} size={40} />}
              title={stay.guestName}
              detail={[stay.room ? `Room ${stay.room.number}` : null, partyLabel(stay), status.tone === "danger" ? status.label : when].filter(Boolean).join(" · ")}
              trailing={searching ? <StatusPill tone={pillTone[stay.operationalStatus]}>{stayStatusLabel(stay.operationalStatus)}</StatusPill> : undefined}
              chevron
              onPress={() => open(stay.id)}
            />
          );
        })}
      </Panel>
    );
  }

  return (
    <Screen refreshing={stayQuery.isFetching && !stayQuery.isPlaceholderData && !stayQuery.isPending} onRefresh={() => void stayQuery.refetch()}>
      <LargeTitle
        meta={searching ? `${stays.length} matching ${stays.length === 1 ? "stay" : "stays"}` : `${wallet.inHouse.length} in house · ${wallet.waiting.length} waiting for a room`}
        action={<TextLink label="Check-in QR" onPress={() => router.push(`${base}/desk-qr` as Href)} />}
      >
        Stays
      </LargeTitle>
      <View style={styles.search}>
        <TextField value={search} onChangeText={setSearch} placeholder="Search guest name" autoCapitalize="words" autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" />
      </View>

      <View style={stayQuery.isPlaceholderData && { opacity: 0.6 }}>
        {searching ? (
          <View style={styles.section}>{stays.length ? rows(stays) : <EmptyState icon={CalendarDays} text="No stays match this search." action={{ label: "Clear search", onPress: () => setSearch("") }} />}</View>
        ) : stays.length ? (
          <>
            {wallet.inHouse.length ? (
              <View style={styles.section}>
                <GroupTitle>In house</GroupTitle>
                <StayWallet cards={wallet.inHouse} onOpen={open} />
              </View>
            ) : null}
            {wallet.waiting.length ? (
              <View style={styles.section}>
                <GroupTitle>Waiting for a room</GroupTitle>
                <Panel>
                  {wallet.waiting.map((stay) => (
                    <ListRow
                      key={stay.id}
                      leading={
                        <View style={styles.slot}>
                          <KeyRound color={colors.warning} size={20} strokeWidth={1.8} />
                        </View>
                      }
                      title={stay.guestName}
                      detail={`${partyLabel(stay)} · checked in on phone ${formatTime(stay.submittedAt)}`}
                      chevron
                      onPress={() => open(stay.id)}
                    />
                  ))}
                </Panel>
              </View>
            ) : null}
            {wallet.past.length ? (
              <View style={styles.section}>
                <GroupTitle>Checked out</GroupTitle>
                {rows(wallet.past)}
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.section}>
            <EmptyState icon={CalendarDays} text="No stays yet. Guests appear here as soon as they scan your check-in QR." />
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { marginTop: space.xl },
  section: { marginTop: space.xl, gap: space.sm },
  slot: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#e7b16b", alignItems: "center", justifyContent: "center" },
});
