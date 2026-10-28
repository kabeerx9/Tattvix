// Rooms: the floor board. An occupied room opens its stay; any other room opens
// its sheet (status changes apply optimistically; a ready room can take a waiting guest).
import { getFloorBoard, getNeedsAction, getRoomStats, localDayKey } from "@tattvix/api";
import { useQueries, useQuery } from "@tanstack/react-query";
import { BedDouble } from "lucide-react-native";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AddRoomSheet } from "@/src/components/add-room-sheet";
import { RoomSheet, StaySheet } from "@/src/components/desk-sheets";
import { FloorBoard, RoomStatusStrip } from "@/src/components/floor-board";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { EmptyState, LargeTitle, Screen, TextLink, space } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import { getDeskScope } from "@/src/lib/desk-scope";
import { useHotelPlace } from "@/src/lib/hotel-place";


export default function RoomsScreen() {
  const place = useHotelPlace();
  const scope = getDeskScope(place);
  const { organizationSlug, propertySlug } = scope;
  const [roomQuery, stayQuery] = useQueries({ queries: [queries.hotelOperations.rooms(organizationSlug, propertySlug), queries.hotelStays.list(organizationSlug, propertySlug)] });
  const photos = useQuery(queries.propertyPhotos.list(organizationSlug, propertySlug));
  const router = useRouter();
  const [roomId, setRoomId] = useState<number | null>(null);
  const [stayId, setStayId] = useState<string | null>(null);
  const [assignRoomId, setAssignRoomId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  if (!roomQuery.data) {
    if (roomQuery.isError) return <RetryScreen error={roomQuery.error} onRetry={() => void roomQuery.refetch()} retrying={roomQuery.isFetching} />;
    return <PendingScreen />;
  }

  const rooms = roomQuery.data.rooms.filter((room) => room.isActive);
  const stats = getRoomStats(rooms);
  const stays = stayQuery.data?.stays ?? [];
  const waiting = getNeedsAction(stays, []).waiting;
  const floors = getFloorBoard(rooms, stays, localDayKey(new Date()));

  return (
    <Screen refreshing={roomQuery.isFetching && !roomQuery.isPending} onRefresh={() => void roomQuery.refetch()}>
      <LargeTitle
        meta={stats.active ? `${stats.active} rooms · ${stats.occupancyPercent}% occupied tonight` : place.propertyName}
        action={scope.canManageRooms ? <TextLink label="Add room" onPress={() => setAddOpen(true)} /> : undefined}
      >
        Rooms
      </LargeTitle>
      {rooms.length ? (
        <>
          <RoomStatusStrip stats={stats} floors={floors} />
          <FloorBoard
            floors={floors}
            onOpen={(tile) => (tile.stayId ? router.push(`/(hotel)/${organizationSlug}/${propertySlug}/stays/${tile.stayId}` as Href) : setRoomId(tile.room.id))}
          />
        </>
      ) : (
        <View style={styles.empty}>
          <EmptyState icon={BedDouble} text={scope.canManageRooms ? "Add the first room to get started." : "This property has no rooms yet. Your owner can add them to get started."} />
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
  empty: { marginTop: space.xl },
});
