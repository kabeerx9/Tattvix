// The Today page's pieces: a row per reservation, a ready-room tile, the
// housekeeping list and tonight's occupancy. Presentation only; the page owns
// data and sheets.
import { formatMoneyWholeRupees, getReservationDetail, getRoomStats, getStayCardAction } from "@tattvix/api";
import type { HotelRoom, HotelStayListItem, PropertyPhotosResponse } from "@tattvix/contracts";
import { BrushCleaning } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { Button, Card, InitialsAvatar, ListRow, Panel, PhotoTile, StatusPill, colors, radii, space, type } from "@/src/design-system";
import { usePressFeedback } from "@/src/design-system/press";
import type { DeskScope } from "@/src/lib/desk-scope";
import { formatDay, formatTime, initialsOf, partyLabel, roomMeta } from "@/src/lib/format";

import { roomPhotoUrl } from "./desk-sheets";

/** One-line facts for a reservation row: who, where, and the time that matters. */
/** Every guest in the tab at once: one row per stay, its one action on the row. */
export function ReservationList({ stays, rooms, todayKey, scope, onOpen }: { stays: HotelStayListItem[]; rooms: HotelRoom[]; todayKey: string; scope: DeskScope; onOpen: (stayId: string) => void }) {
  return (
    <Panel>
      {stays.map((stay) => {
        const room = stay.room ? rooms.find((candidate) => candidate.id === stay.room!.id) : undefined;
        const action = getStayCardAction(stay, todayKey, scope);
        const detail = getReservationDetail(stay, room?.number ?? null, todayKey);
        return (
          <ListRow
            key={stay.id}
            title={stay.guestName}
            detail={detail.text}
            detailTone={detail.overdue ? "destructive" : "muted"}
            detailLines={2}
            leading={<InitialsAvatar initials={initialsOf(stay.guestName)} size={40} />}
            trailing={action === "view" ? undefined : <Button label={action === "assignRoom" ? "Assign room" : "Check out"} variant="outline" size="sm" onPress={() => onOpen(stay.id)} />}
            chevron={action === "view"}
            onPress={() => onOpen(stay.id)}
          />
        );
      })}
    </Panel>
  );
}

export function ReadyRoomCard({ room, photos, onOpen }: { room: HotelRoom; photos?: PropertyPhotosResponse; onOpen: () => void }) {
  const press = usePressFeedback();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Room ${room.number}`} onPress={onOpen} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={press.style}>
        <PhotoTile uri={roomPhotoUrl(photos, room.roomType)} radius={radii.card} emptyText badge={<StatusPill tone="onPhoto">Ready</StatusPill>} />
        <Text style={[styles.roomTitle, { marginTop: 10 }]}>Room {room.number}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[roomMeta(room), room.nightlyRateMinor !== null ? `${formatMoneyWholeRupees(room.nightlyRateMinor)} night` : "No nightly rate yet"].filter(Boolean).join(" · ")}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function Housekeeping({ rooms, scope, onOpenRoom }: { rooms: HotelRoom[]; scope: DeskScope; onOpenRoom: (roomId: number) => void }) {
  const toClean = rooms.filter((room) => room.isActive && room.status === "CLEANING");
  const outOfService = rooms.filter((room) => room.isActive && room.status === "MAINTENANCE");
  const list = [...toClean, ...outOfService];
  return (
    <Card>
      <Text style={styles.cardTitle}>Housekeeping</Text>
      <Text style={styles.meta}>
        {toClean.length ? `${toClean.length} ${toClean.length === 1 ? "room" : "rooms"} to clean` : "Every room is clean"}
        {outOfService.length ? ` · ${outOfService.length} in maintenance` : ""}
      </Text>
      {list.length ? (
        <View style={{ marginTop: space.md }}>
          {list.map((room, index) => (
            <View key={room.id} style={[styles.hkRow, index > 0 && styles.hkDivider]}>
              <Text style={styles.hkNumber}>{room.number}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.body} numberOfLines={1}>
                  {room.roomType || `Room ${room.number}`}
                </Text>
                <Text style={[type.label, { color: room.status === "CLEANING" ? colors.warning : colors.destructive }]}>{room.status === "CLEANING" ? "Cleaning" : "Maintenance"}</Text>
              </View>
              {scope.canManageRooms ? <Button label={room.status === "CLEANING" ? "Mark ready" : "Update"} variant="outline" size="sm" onPress={() => onOpenRoom(room.id)} /> : null}
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.hkRow, { marginTop: space.md, minHeight: 0 }]}>
          <BrushCleaning color={colors.mutedForeground} size={20} strokeWidth={1.6} />
          <Text style={styles.meta}>Nothing waiting on housekeeping.</Text>
        </View>
      )}
    </Card>
  );
}

export function Tonight({ rooms, averagePercent, revenueMinor }: { rooms: HotelRoom[]; averagePercent: number | null; revenueMinor: number | null }) {
  const stats = getRoomStats(rooms);
  const share = (value: number) => (stats.active ? value / stats.active : 0);
  return (
    <Card>
      <Text style={styles.cardTitle}>Tonight</Text>
      <Text style={styles.meta}>{stats.active ? `${stats.occupied} of ${stats.active} rooms occupied` : "No active rooms yet"}</Text>
      <View style={styles.occupancyRow}>
        <Text style={styles.occupancy}>{stats.occupancyPercent}%</Text>
        <Text style={[styles.meta, { paddingBottom: 6 }]}>occupancy</Text>
      </View>
      <View style={styles.bar} accessibilityElementsHidden>
        <View style={{ flex: share(stats.occupied), backgroundColor: colors.foreground }} />
        <View style={{ flex: share(stats.cleaning), backgroundColor: colors.warning }} />
        <View style={{ flex: share(stats.maintenance), backgroundColor: colors.destructive }} />
        <View style={{ flex: share(stats.vacant) }} />
      </View>
      <Text style={[styles.meta, { marginTop: space.md }]}>
        {stats.vacant} ready · {stats.cleaning} cleaning · {stats.maintenance} maintenance
      </Text>
      {averagePercent !== null || revenueMinor !== null ? (
        <View style={styles.statRow}>
          {averagePercent !== null ? (
            <View style={{ flex: 1 }}>
              <Text style={styles.factLabel}>Average, last 7 days</Text>
              <Text style={styles.factValue}>{averagePercent}%</Text>
            </View>
          ) : null}
          {revenueMinor !== null ? (
            <View style={{ flex: 1 }}>
              <Text style={styles.factLabel}>Revenue, last 7 days</Text>
              <Text style={styles.factValue}>{formatMoneyWholeRupees(revenueMinor)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  meta: { ...type.meta, color: colors.mutedForeground },
  rowTitle: { ...type.rowTitle, color: colors.foreground, fontVariant: ["tabular-nums"] },
  roomTitle: { ...type.cardTitle, fontSize: 16, color: colors.foreground },
  rate: { fontFamily: type.rowTitle.fontFamily, color: colors.foreground },
  cardTitle: { ...type.cardTitle, color: colors.foreground, marginBottom: 2 },
  body: { ...type.body, color: colors.foreground },
  hkRow: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 56, paddingVertical: 6 },
  hkDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSoft },
  hkNumber: { ...type.headerTitle, color: colors.foreground, width: 48, fontVariant: ["tabular-nums"] },
  occupancyRow: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, marginTop: space.xl },
  occupancy: { fontFamily: type.largeTitle.fontFamily, fontSize: 44, lineHeight: 48, letterSpacing: -1, color: colors.foreground, fontVariant: ["tabular-nums"] },
  bar: { flexDirection: "row", height: 8, borderRadius: radii.pill, backgroundColor: colors.muted, overflow: "hidden", marginTop: space.lg },
  statRow: { flexDirection: "row", gap: space.lg, marginTop: space.xl, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSoft },
  factLabel: { ...type.label, color: colors.subtleForeground },
  factValue: { ...type.rowTitle, color: colors.foreground, marginTop: 2, fontVariant: ["tabular-nums"] },
});
