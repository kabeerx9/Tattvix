// The top of a stay: a room-key card in the brand's deep rose, with the stay's
// state as a solid pill and checkout as the loudest line. Mirrors
// apps/web/src/features/hotel-stays/components/stay-key-card.tsx; text comes
// from getStayKeyCard in @tattvix/api.
import type { StayKeyCard as StayKeyCardModel } from "@tattvix/api";
import { LinearGradient } from "expo-linear-gradient";
import { AlarmClock, CircleCheck, Clock3, LogOut } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, keyCard, radii, space, type } from "@/src/design-system";

const statusLook = {
  success: { fill: keyCard.success, Icon: CircleCheck },
  warning: { fill: keyCard.warning, Icon: Clock3 },
  danger: { fill: keyCard.danger, Icon: AlarmClock },
  muted: { fill: "rgba(255,255,255,0.18)", Icon: LogOut },
} as const;

export function StayKeyCard({
  card,
  roomNumber,
  roomDetail,
  guestName,
  initials,
  party,
  checkedIn,
}: {
  card: StayKeyCardModel;
  roomNumber: string | null;
  roomDetail: string | null;
  guestName: string;
  initials: string;
  /** "+ Rohan Sharma" or "1 guest". */
  party: string;
  /** "Checked in Tue 27 Oct, 3:12 pm". */
  checkedIn: string | null;
}) {
  const status = statusLook[card.status.tone];
  const { checkout } = card;
  return (
    <LinearGradient colors={keyCard.gradient} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.card}>
      <View style={[styles.status, { backgroundColor: status.fill }]} accessibilityRole="text">
        <status.Icon color="#ffffff" size={17} strokeWidth={2.2} />
        <Text style={styles.statusText}>{card.status.label}</Text>
      </View>

      <Text style={[styles.room, !roomNumber && styles.noRoom]} accessibilityLabel={roomNumber ? `Room ${roomNumber}` : "No room yet"}>
        {roomNumber ?? "No room yet"}
      </Text>
      {roomNumber && roomDetail ? <Text style={styles.dim}>{roomDetail}</Text> : null}

      <View style={styles.who}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{guestName}</Text>
          <Text style={styles.dim} numberOfLines={1}>{party}</Text>
        </View>
      </View>

      <View style={[styles.out, checkout.overdue && styles.outLate]}>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.outLabel}>{checkout.label}</Text>
          <Text style={[styles.outWhen, checkout.overdue && styles.late]} numberOfLines={1} adjustsFontSizeToFit>
            {checkout.when}
          </Text>
        </View>
        {checkout.countdown ? (
          <View style={styles.count}>
            <Text style={styles.countLead}>{checkout.countdown.lead}</Text>
            <Text style={[styles.countValue, checkout.overdue && styles.late]}>{checkout.countdown.value}</Text>
          </View>
        ) : null}
      </View>

      {checkedIn ? <Text style={[styles.dim, styles.checkedIn]}>{checkedIn}</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: space.xl, marginTop: space.lg, overflow: "hidden" },
  status: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingVertical: 8, paddingLeft: 12, paddingRight: 14, borderRadius: radii.pill },
  statusText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 18, color: "#ffffff" },
  room: { fontFamily: fonts.bold, fontSize: 64, lineHeight: 68, letterSpacing: -2.5, color: "#ffffff", marginTop: space.lg, fontVariant: ["tabular-nums"] },
  noRoom: { fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: "rgba(255,255,255,0.75)" },
  dim: { ...type.meta, color: "rgba(255,255,255,0.72)" },
  who: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.lg },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.semibold, fontSize: 13, color: "#ffffff" },
  name: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, color: "#ffffff" },
  out: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.lg, backgroundColor: colors.card, borderRadius: 16, paddingVertical: 14, paddingHorizontal: space.lg },
  outLate: { backgroundColor: colors.destructiveTint, borderWidth: 2, borderColor: keyCard.danger },
  outLabel: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.5, textTransform: "uppercase", color: colors.mutedForeground },
  outWhen: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5, color: colors.foreground },
  late: { color: colors.destructive },
  count: { marginLeft: "auto", alignItems: "flex-end" },
  countLead: { ...type.meta, color: colors.mutedForeground },
  countValue: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5, color: colors.foreground },
  checkedIn: { marginTop: space.md },
});
