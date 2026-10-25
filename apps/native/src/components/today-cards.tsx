// The Today page's cards: a guest card per reservation, a ready-room tile, the
// housekeeping list and tonight's occupancy. Presentation only; the page owns
// data and sheets.
import { formatMoneyWholeRupees, getRoomStats, getStayCardAction, getStayStatus } from "@tattvix/api";
import type { HotelRoom, HotelStayListItem, PropertyPhotosResponse } from "@tattvix/contracts";
import { BrushCleaning } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button, Card, InitialsAvatar, PhotoTile, colors, radii, space, type } from "@/src/design-system";
import type { DeskScope } from "@/src/lib/desk-scope";
import { formatDay, formatTime, initialsOf, partyLabel, roomMeta } from "@/src/lib/format";

import { roomPhotoUrl } from "./desk-sheets";

const toneColor = { warning: colors.warning, danger: colors.destructive, primary: colors.mutedForeground, muted: colors.mutedForeground } as const;

export function ReservationCard({ stay, room, todayKey, scope, onOpen }: { stay: HotelStayListItem; room?: HotelRoom; todayKey: string; scope: DeskScope; onOpen: () => void }) {
  const status = getStayStatus(stay, todayKey);
  const action = getStayCardAction(stay, todayKey, scope);
  const detail =
    stay.operationalStatus === "PENDING_CHECK_IN"
      ? `${partyLabel(stay)} · checked in on their phone at ${formatTime(stay.submittedAt)}`
      : stay.operationalStatus === "CHECKED_OUT"
        ? `${partyLabel(stay)} · left at ${formatTime(stay.checkedOutAt)}`
        : stay.expectedCheckOutDate
          ? `${partyLabel(stay)} · due out ${formatDay(stay.expectedCheckOutDate, todayKey, true)}`
          : `${partyLabel(stay)} · no checkout date`;

  return (
    <Card style={styles.reservation} onPress={onOpen} accessibilityLabel={`${stay.guestName}, ${status.label}`}>
      <View style={styles.reservationTop}>
        <Text style={[styles.statusLine, { color: toneColor[status.tone] }]}>{status.label}</Text>
        <InitialsAvatar initials={initialsOf(stay.guestName)} />
      </View>
      <Text style={styles.guestName} numberOfLines={2}>
        {stay.guestName}
      </Text>
      <Text style={[styles.meta, styles.inset]} numberOfLines={1}>
        {room ? `Room ${room.number}${room.roomType ? ` · ${room.roomType}` : ""}` : "No room yet"}
      </Text>
      <Text style={[styles.meta, styles.inset, { marginTop: space.md }]} numberOfLines={2}>
        {detail}
      </Text>
      <View style={styles.reservationAction}>
        <Button label={action === "assignRoom" ? "Assign room" : action === "checkOut" ? "Check out" : "Details"} variant={action === "view" ? "ghost" : "outline"} onPress={onOpen} />
      </View>
    </Card>
  );
}

export function ReadyRoomCard({ room, photos, onOpen }: { room: HotelRoom; photos?: PropertyPhotosResponse; onOpen: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Room ${room.number}`} onPress={onOpen} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      <PhotoTile uri={roomPhotoUrl(photos, room.roomType)} />
      <Text style={[styles.rowTitle, { marginTop: 10 }]}>Room {room.number}</Text>
      <Text style={styles.meta} numberOfLines={1}>
        {roomMeta(room) || "Ready"}
      </Text>
      {room.nightlyRateMinor !== null ? (
        <Text style={styles.meta}>
          <Text style={styles.rate}>{formatMoneyWholeRupees(room.nightlyRateMinor)}</Text> night
        </Text>
      ) : (
        <Text style={styles.meta}>No nightly rate yet</Text>
      )}
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
  reservation: { padding: 0, overflow: "hidden" },
  reservationTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: space.md, paddingHorizontal: space.xl, paddingTop: space.xl },
  statusLine: { ...type.rowTitle, paddingTop: 4, flex: 1 },
  guestName: { ...type.cardTitle, color: colors.foreground, paddingHorizontal: space.xl, marginTop: 4 },
  meta: { ...type.meta, color: colors.mutedForeground },
  inset: { paddingHorizontal: space.xl },
  reservationAction: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSoft, padding: space.md, marginTop: space.lg },
  rowTitle: { ...type.rowTitle, color: colors.foreground, fontVariant: ["tabular-nums"] },
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
