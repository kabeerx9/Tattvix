import { useUser } from "@clerk/clerk-expo";
import { FileCheck2, ShieldCheck, UsersRound } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { AppButton, Card, IconTile } from "@/src/design-system/components";
import { GuestPage } from "@/src/design-system/guest-page";
import { useAppTheme } from "@/src/design-system/theme";

export default function GuestHome() {
  const { user } = useUser();
  const { colors } = useAppTheme();
  const name = user?.firstName || user?.username || "Guest";

  return (
    <GuestPage
      eyebrow="Guest account"
      title={`Hello, ${name}`}
      description="Your travel details and privacy choices, ready when you need them."
    >
      <Card style={styles.readiness}>
        <View style={styles.readinessHeader}>
          <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Profile readiness</Text><Text style={[styles.sectionCopy, { color: colors.mutedForeground }]}>Two of three essentials complete</Text></View>
          <Text style={[styles.percentage, { color: colors.foreground }]}>67%</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}><View style={[styles.progressFill, { backgroundColor: colors.primary }]} /></View>
        <View style={styles.button}><AppButton label="Complete profile" onPress={() => {}} /></View>
      </Card>

      <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Travel essentials</Text></View>
      <Card style={styles.listCard}>
        <ListRow icon={FileCheck2} title="Identity details" detail="Ready for check-in" status="Complete" />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <ListRow icon={UsersRound} title="Companions" detail="2 saved profiles" status="Review" />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <ListRow icon={ShieldCheck} title="Privacy access" detail="No active hotel access" status="Private" />
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent activity</Text>
        <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>Your sharing and check-in activity will appear here.</Text>
      </Card>
    </GuestPage>
  );
}

function ListRow({ icon, title, detail, status }: { icon: typeof FileCheck2; title: string; detail: string; status: string }) {
  const { colors } = useAppTheme();
  return <View style={styles.row}><IconTile icon={icon} /><View style={styles.grow}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.rowCopy, { color: colors.mutedForeground }]}>{detail}</Text></View><Text style={[styles.status, { color: colors.primary }]}>{status}</Text></View>;
}

const styles = StyleSheet.create({
  readiness: { gap: 18 }, readinessHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  sectionHeader: { marginTop: 8 }, sectionTitle: { fontSize: 16, fontWeight: "700", letterSpacing: -0.25 }, sectionCopy: { marginTop: 4, fontSize: 12 }, percentage: { fontSize: 24, fontWeight: "700", letterSpacing: -0.8 },
  progressTrack: { height: 7, overflow: "hidden", borderRadius: 999 }, progressFill: { width: "67%", height: "100%", borderRadius: 999 }, button: { alignSelf: "flex-start", minWidth: 150 },
  listCard: { paddingVertical: 4 }, row: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 12 }, grow: { flex: 1, gap: 3 }, rowTitle: { fontSize: 14, fontWeight: "700" }, rowCopy: { fontSize: 12 }, status: { fontSize: 11, fontWeight: "700" }, divider: { height: StyleSheet.hairlineWidth, marginLeft: 57 }, emptyCopy: { marginTop: 8, fontSize: 13, lineHeight: 19 },
});
