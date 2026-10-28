// Rooms as a floor board, like the board behind a reception desk: every room
// as a small tile, floor by floor. Occupied rooms wear the stay key card's
// colour, with the guest's first name; a dot marks who leaves today (amber) or
// is late (red). Mirrors apps/web/src/features/hotel-operations/components/floor-board.tsx;
// grouping comes from getFloorBoard in @tattvix/api.
import type { FloorBoardFloor, FloorBoardTile, RoomStats } from "@tattvix/api";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, keyCard, radii, space, type } from "@/src/design-system";

const PER_ROW = 4;
const leavingDot = "#fbbf24";

const legend = [
  { key: "occupied", label: "occupied", color: keyCard.board },
  { key: "vacant", label: "ready", color: keyCard.success },
  { key: "cleaning", label: "cleaning", color: keyCard.warning },
  { key: "maintenance", label: "maintenance", color: "#bdbdbd" },
] as const;

/** The coloured bar and counts over the board. */
export function RoomStatusStrip({ stats, floors }: { stats: RoomStats; floors: FloorBoardFloor[] }) {
  const tiles = floors.flatMap((floor) => floor.tiles);
  const leaving = tiles.filter((tile) => tile.leavingToday).length;
  const late = tiles.filter((tile) => tile.overdue).length;
  const shown = legend.filter((item) => stats[item.key] > 0);
  return (
    <View style={styles.summary}>
      <View style={styles.strip}>
        {shown.map((item) => (
          <View key={item.key} style={{ flex: stats[item.key], backgroundColor: item.color }} />
        ))}
      </View>
      <View style={styles.legend}>
        {shown.map((item) => (
          <View key={item.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>
              <Text style={styles.legendCount}>{stats[item.key]}</Text> {item.label}
            </Text>
          </View>
        ))}
      </View>
      {leaving || late ? (
        <View style={styles.legend}>
          {leaving ? (
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: leavingDot }]} />
              <Text style={styles.legendText}>{leaving} leaving today</Text>
            </View>
          ) : null}
          {late ? (
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: keyCard.danger }]} />
              <Text style={styles.legendText}>{late} late to check out</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function FloorBoard({ floors, onOpen }: { floors: FloorBoardFloor[]; onOpen: (tile: FloorBoardTile) => void }) {
  return (
    <View>
      {floors.map((floor) => (
        <View key={floor.label} style={styles.floor}>
          <Text style={styles.floorLabel} accessibilityRole="header">
            {floor.label}
          </Text>
          {chunk(floor.tiles).map((row, index) => (
            <View key={index} style={styles.row}>
              {row.map((tile) => (
                <Tile key={tile.room.id} tile={tile} onPress={() => onOpen(tile)} />
              ))}
              {Array.from({ length: PER_ROW - row.length }, (_, spacer) => (
                <View key={`spacer-${spacer}`} style={styles.cell} />
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function Tile({ tile, onPress }: { tile: FloorBoardTile; onPress: () => void }) {
  const look = looks[tile.kind];
  const flag = tile.overdue ? keyCard.danger : tile.leavingToday ? leavingDot : null;
  const label = `Room ${tile.room.number}, ${tile.caption}${tile.overdue ? ", checkout overdue" : tile.leavingToday ? ", leaving today" : ""}`;
  const body = (
    <>
      {flag ? <View style={[styles.flag, { backgroundColor: flag }]} /> : null}
      <Text style={[styles.number, { color: look.ink }]} numberOfLines={1} adjustsFontSizeToFit>
        {tile.room.number}
      </Text>
      <Text style={[styles.caption, { color: look.sub }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {tile.caption}
      </Text>
    </>
  );
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.cell, pressed && { opacity: 0.8 }]}>
      {tile.kind === "occupied" ? (
        <LinearGradient colors={keyCard.gradient} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.tile}>
          {body}
        </LinearGradient>
      ) : (
        <View style={[styles.tile, look.box]}>{body}</View>
      )}
    </Pressable>
  );
}

const looks = {
  occupied: { box: null, ink: "#ffffff", sub: "rgba(255,255,255,0.82)" },
  ready: { box: { backgroundColor: colors.successTint, borderWidth: 1.5, borderColor: "#a7e3c0" }, ink: colors.success, sub: colors.success },
  cleaning: { box: { backgroundColor: colors.warningTint }, ink: colors.warning, sub: colors.warning },
  maintenance: { box: { backgroundColor: "#f0f0f0", borderWidth: 1.5, borderColor: "#d4d4d4", borderStyle: "dashed" as const }, ink: colors.mutedForeground, sub: colors.mutedForeground },
};

function chunk<T>(items: T[]) {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += PER_ROW) rows.push(items.slice(index, index + PER_ROW));
  return rows;
}

const styles = StyleSheet.create({
  summary: { marginTop: space.lg },
  strip: { flexDirection: "row", height: 10, borderRadius: radii.pill, overflow: "hidden", gap: 2 },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: space.lg, rowGap: 4, marginTop: space.sm },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...type.meta, color: colors.foreground },
  legendCount: { fontFamily: fonts.bold },
  floor: { marginTop: space.xl },
  floorLabel: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.mutedForeground, marginBottom: space.sm, marginLeft: 2 },
  row: { flexDirection: "row", gap: space.sm, marginBottom: space.sm },
  cell: { flex: 1, aspectRatio: 1 / 1.05 },
  tile: { flex: 1, borderRadius: 14, padding: 9, justifyContent: "space-between", overflow: "hidden" },
  number: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, letterSpacing: -0.4 },
  caption: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
  flag: { position: "absolute", top: 8, right: 8, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: "rgba(255,255,255,0.9)" },
});
