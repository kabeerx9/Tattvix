// Rooms: counts, a status filter and the grid. Tapping a room opens its sheet
// (status changes apply optimistically; a ready room can take a waiting guest).
import { getNeedsAction, getRoomStats } from "@tattvix/api";
import type { HotelRoom } from "@tattvix/contracts";
import { useQueries, useQuery } from "@tanstack/react-query";
import { BedDouble } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AddRoomSheet } from "@/src/components/add-room-sheet";
import { RoomSheet, StaySheet, roomPhotoUrl } from "@/src/components/desk-sheets";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { EmptyState, Kpi, KpiRow, LargeTitle, PhotoTile, PillTabs, Screen, StatusPill, TextLink, colors, space, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import { getDeskScope } from "@/src/lib/desk-scope";
import { roomMeta, roomStatusLabel, roomStatusTone } from "@/src/lib/format";
import { useHotelPlace } from "@/src/lib/hotel-place";

type Filter = "ALL" | HotelRoom["status"];
const filters: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "VACANT", label: "Ready" },
  { key: "OCCUPIED", label: "Occupied" },
  { key: "CLEANING", label: "Cleaning" },
  { key: "MAINTENANCE", label: "Maintenance" },
];
const order = new Intl.Collator("en", { numeric: true });

export default function RoomsScreen() {
  const place = useHotelPlace();
  const scope = getDeskScope(place);
  const { organizationSlug, propertySlug } = scope;
  const [roomQuery, stayQuery] = useQueries({ queries: [queries.hotelOperations.rooms(organizationSlug, propertySlug), queries.hotelStays.list(organizationSlug, propertySlug)] });
  const photos = useQuery(queries.propertyPhotos.list(organizationSlug, propertySlug));
  const [filter, setFilter] = useState<Filter>("ALL");
  const [roomId, setRoomId] = useState<number | null>(null);
  const [stayId, setStayId] = useState<string | null>(null);
  const [assignRoomId, setAssignRoomId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  if (!roomQuery.data) {
    if (roomQuery.isError) return <RetryScreen onRetry={() => void roomQuery.refetch()} retrying={roomQuery.isFetching} />;
    return <PendingScreen />;
  }

  const rooms = [...roomQuery.data.rooms].filter((room) => room.isActive).sort((a, b) => order.compare(a.number, b.number));
  const stats = getRoomStats(rooms);
  const shown = filter === "ALL" ? rooms : rooms.filter((room) => room.status === filter);
  const stays = stayQuery.data?.stays ?? [];
  const waiting = getNeedsAction(stays, []).waiting;
  const count = (status: HotelRoom["status"]) => rooms.filter((room) => room.status === status).length;

  return (
    <Screen refreshing={roomQuery.isFetching && !roomQuery.isPending} onRefresh={() => void roomQuery.refetch()}>
      <LargeTitle
        meta={stats.active ? `${stats.active} rooms · ${stats.occupancyPercent}% occupied tonight` : place.propertyName}
        action={scope.canManageRooms ? <TextLink label="Add room" onPress={() => setAddOpen(true)} /> : undefined}
      >
        Rooms
      </LargeTitle>
      <View style={styles.kpis}>
        <KpiRow>
          <Kpi label="Ready" value={stats.vacant} />
          <Kpi label="Occupied" value={stats.occupied} />
          <Kpi label="Cleaning" value={stats.cleaning} />
        </KpiRow>
      </View>
      <PillTabs items={filters.map((item) => ({ key: item.key, label: item.label, count: item.key === "ALL" ? rooms.length : count(item.key) }))} value={filter} onChange={(key) => setFilter(key as Filter)} />

      {shown.length ? (
        <View style={styles.grid}>
          {shown.map((room) => (
            <Pressable key={room.id} accessibilityRole="button" accessibilityLabel={`Room ${room.number}, ${roomStatusLabel[room.status]}`} onPress={() => setRoomId(room.id)} style={({ pressed }) => [styles.cell, pressed && { opacity: 0.85 }]}>
              <PhotoTile uri={roomPhotoUrl(photos.data, room.roomType)} label={`Room ${room.number}`} />
              <View style={styles.cellMeta}>
                <Text style={styles.cellType} numberOfLines={1}>
                  {roomMeta(room) || "Standard"}
                </Text>
                <StatusPill tone={roomStatusTone[room.status]}>{roomStatusLabel[room.status]}</StatusPill>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <EmptyState icon={BedDouble} text={rooms.length ? `No rooms are ${roomStatusLabel[filter as HotelRoom["status"]]?.toLowerCase() ?? "here"} right now.` : scope.canManageRooms ? "Add the first room to get started." : "This property has no rooms yet. Add them on the web."} />
        </View>
      )}

      {scope.canManageRooms ? <AddRoomSheet scope={scope} open={addOpen} onClose={() => setAddOpen(false)} /> : null}
      <RoomSheet
        scope={scope}
        roomId={roomId}
        rooms={rooms}
        photos={photos.data}
        waitingStays={waiting}
        onAssign={(id, room) => {
          setRoomId(null);
          setAssignRoomId(room);
          setStayId(id);
        }}
        onClose={() => setRoomId(null)}
      />
      <StaySheet scope={scope} stayId={stayId} stays={stays} rooms={rooms} photos={photos.data} initialRoomId={assignRoomId} onClose={() => { setStayId(null); setAssignRoomId(null); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kpis: { marginTop: space.xl },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md, marginTop: space.xl },
  cell: { width: "48%", flexGrow: 1, maxWidth: "49%" },
  cellMeta: { marginTop: space.sm, gap: 6 },
  cellType: { ...type.meta, color: colors.mutedForeground },
  empty: { marginTop: space.xl },
});
