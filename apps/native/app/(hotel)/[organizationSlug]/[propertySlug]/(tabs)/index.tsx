// Today: reservation pill tabs over a list of guests, a quiet setup nudge, a
// rail of rooms ready for check-in, housekeeping and tonight's occupancy.
// Actions open in sheets.
import { getDefaultReservationTab, getHotelOnboarding, getOccupancyTrend, getReadyRooms, getReservationGroups, getTodayHeadline, localDayKey, onboardingStorageKey, stayStatusLabel, type ReservationTab } from "@tattvix/api";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { BedDouble, DoorOpen, QrCode, Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { RoomSheet, StaySheet } from "@/src/components/desk-sheets";
import { OnboardingPrompt } from "@/src/components/onboarding";
import { Housekeeping, ReadyRoomCard, ReservationList, Tonight } from "@/src/components/today-cards";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { EmptyState, Enter, HeroAction, HeroScreen, PillTabs, Rail, SectionTitle, TextLink, colors, fonts, radii, space, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import { useCurrentUser } from "@/src/lib/current-user";
import { getDeskScope } from "@/src/lib/desk-scope";
import { formatLongDate } from "@/src/lib/format";
import { useHotelPlace } from "@/src/lib/hotel-place";
import { dismissOnboarding, readOnboardingDismissal, shouldShowOnboardingPrompt } from "@/src/lib/onboarding";

const tabLabels: Record<ReservationTab, string> = {
  arriving: stayStatusLabel("PENDING_CHECK_IN"),
  checkingOut: "Checking out",
  inHouse: stayStatusLabel("CHECKED_IN"),
  checkedOut: "Checked out today",
};
const tabOrder: ReservationTab[] = ["arriving", "checkingOut", "inHouse", "checkedOut"];

const emptyCopy: Record<ReservationTab, { icon: typeof QrCode; text: string }> = {
  arriving: { icon: QrCode, text: "No one is waiting for a room. Guests appear here as soon as they scan your check-in QR and share their ID." },
  checkingOut: { icon: DoorOpen, text: "No checkouts due today. Guests due out today, and anyone overdue, show up here." },
  inHouse: { icon: BedDouble, text: "No guests are staying right now. Checked-in guests appear here with their room and due-out date." },
  checkedOut: { icon: Sparkles, text: "No checkouts yet today. Guests who leave today are listed here so housekeeping can follow." },
};

export default function TodayScreen() {
  const place = useHotelPlace();
  const scope = getDeskScope(place);
  const router = useRouter();
  const user = useCurrentUser();
  const { organizationSlug, propertySlug } = scope;
  const canManageSetup = place.permissions.includes("hotel:manage") || place.permissions.includes("rooms:manage");
  const [stayQuery, roomQuery, summaryQuery] = useQueries({
    queries: [queries.hotelStays.list(organizationSlug, propertySlug), queries.hotelOperations.rooms(organizationSlug, propertySlug), queries.hotelOverview.summary(organizationSlug, propertySlug)],
  });
  const details = useQuery({ ...queries.hotelDetails.property(organizationSlug, propertySlug), enabled: canManageSetup });
  const photos = useQuery(queries.propertyPhotos.list(organizationSlug, propertySlug));
  const [tab, setTab] = useState<ReservationTab | null>(null);
  const [stayId, setStayId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [assignRoomId, setAssignRoomId] = useState<number | null>(null);
  const dismissalKey = user.clerkUserId ? onboardingStorageKey(user.clerkUserId, place.key) : null;
  const [dismissed, setDismissed] = useState(() => dismissalKey ? readOnboardingDismissal(dismissalKey) : false);
  useEffect(() => setDismissed(dismissalKey ? readOnboardingDismissal(dismissalKey) : false), [dismissalKey]);

  const core = [stayQuery, roomQuery, summaryQuery];
  const refetchAll = () => { core.forEach((query) => void query.refetch()); if (canManageSetup) void details.refetch(); };
  const base = `/(hotel)/${organizationSlug}/${propertySlug}`;

  if (!stayQuery.data || !roomQuery.data || !summaryQuery.data) {
    if (core.some((query) => query.isError)) return <RetryScreen onRetry={refetchAll} retrying={core.some((query) => query.isFetching)} />;
    return <PendingScreen />;
  }

  const today = new Date();
  const todayKey = localDayKey(today);
  const stays = stayQuery.data.stays;
  const rooms = roomQuery.data.rooms;
  const groups = getReservationGroups(stays, today);
  const activeTab = tab ?? getDefaultReservationTab(groups);
  const shown = groups[activeTab];
  const readyRooms = getReadyRooms(rooms);
  const trend = getOccupancyTrend(summaryQuery.data).map((entry) => entry.percent);
  const averagePercent = trend.length ? Math.round(trend.reduce((sum, value) => sum + value, 0) / trend.length) : null;
  const empty = emptyCopy[activeTab];
  const headline = getTodayHeadline({ waiting: groups.arriving.length, checkingOut: groups.checkingOut.length, checkedIn: groups.inHouse.length });
  const guide = canManageSetup && details.data && !details.isError ? getHotelOnboarding({
    details: details.data,
    rooms,
    canManageHotel: place.permissions.includes("hotel:manage"),
    canManageRooms: place.permissions.includes("rooms:manage"),
  }) : null;

  return (
    <HeroScreen
      image={photos.data?.cover?.url}
      eyebrow={formatLongDate(today)}
      title={place.propertyName}
      action={<HeroAction label="Check-in QR" icon={QrCode} onPress={() => router.push(`${base}/desk-qr` as Href)} />}
      refreshing={core.some((query) => query.isFetching && !query.isPending)}
      onRefresh={refetchAll}
    >
      <Enter>
        <Text style={styles.headline}>{headline.title}</Text>
        <Text style={styles.headlineDetail}>{headline.detail}</Text>
      </Enter>

      <Enter index={1} style={styles.firstSection}>
        <PillTabs items={tabOrder.map((key) => ({ key, label: tabLabels[key], count: groups[key].length }))} value={activeTab} onChange={(key) => setTab(key as ReservationTab)} />
        {shown.length ? (
          <View style={styles.list}>
            <ReservationList key={activeTab} stays={shown} rooms={rooms} todayKey={todayKey} scope={scope} onOpen={setStayId} />
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <EmptyState
              icon={empty.icon}
              text={empty.text}
              action={activeTab === "arriving" ? { label: "Show the check-in QR", onPress: () => router.push(`${base}/desk-qr` as Href) } : { label: "View all stays", onPress: () => router.push(`${base}/stays` as Href) }}
            />
          </View>
        )}
        {guide && !scope.readOnly && shouldShowOnboardingPrompt({ isComplete: guide.isComplete, dismissed }) ? <View style={styles.setup}><OnboardingPrompt compact guide={guide} dismissed={dismissed} readOnly={scope.readOnly} onOpen={() => router.push(`${base}/getting-started` as Href)} onDismiss={() => {
          if (dismissalKey) dismissOnboarding(dismissalKey);
          setDismissed(true);
        }} /></View> : null}
      </Enter>

      <Enter index={2} style={styles.section}>
        <SectionTitle
          meta={readyRooms.length ? `${readyRooms.length} ${readyRooms.length === 1 ? "room is" : "rooms are"} clean and free tonight` : rooms.length ? "No room is ready right now" : scope.canManageRooms ? "Add rooms to start checking guests in" : "Your owner can add rooms to get started"}
          action={<TextLink label="All rooms" onPress={() => router.push(`${base}/rooms` as Href)} />}
        >
          Ready tonight
        </SectionTitle>
        {readyRooms.length ? (
          <Rail autoCols={62}>
            {readyRooms.map((room) => (
              <ReadyRoomCard key={room.id} room={room} photos={photos.data} onOpen={() => setRoomId(room.id)} />
            ))}
          </Rail>
        ) : (
          <View style={styles.quiet}>
            <BedDouble color={colors.mutedForeground} size={20} strokeWidth={1.6} />
            <Text style={styles.quietText}>{rooms.length ? "Rooms show up here once they are cleaned and marked ready." : "This property has no rooms yet."}</Text>
          </View>
        )}
      </Enter>

      <Enter index={3} style={[styles.section, { gap: space.md }]}>
        <Housekeeping rooms={rooms} scope={scope} onOpenRoom={setRoomId} />
        <Tonight rooms={rooms} averagePercent={averagePercent} revenueMinor={summaryQuery.data.revenue?.totalMinor ?? null} />
      </Enter>

      <StaySheet scope={scope} stayId={stayId} stays={stays} rooms={rooms} photos={photos.data} initialRoomId={assignRoomId} onClose={() => { setStayId(null); setAssignRoomId(null); }} />
      <RoomSheet
        scope={scope}
        roomId={roomId}
        rooms={rooms}
        photos={photos.data}
        waitingStays={groups.arriving}
        onAssign={(id, room) => {
          setRoomId(null);
          setAssignRoomId(room);
          setStayId(id);
        }}
        onClose={() => setRoomId(null)}
      />
    </HeroScreen>
  );
}

const styles = StyleSheet.create({
  headline: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: colors.foreground },
  headlineDetail: { ...type.meta, color: colors.mutedForeground, marginTop: 2 },
  firstSection: { marginTop: space.sm },
  section: { marginTop: space.xxxl },
  list: { marginTop: space.lg },
  setup: { marginTop: space.md },
  emptyBox: { marginTop: space.lg, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSoft, borderRadius: radii.card, paddingHorizontal: space.lg },
  quiet: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.lg, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSoft, borderRadius: radii.card, padding: space.xl },
  quietText: { ...type.meta, color: colors.mutedForeground, flex: 1 },
});
