import { History, ShieldCheck, ShieldX, type LucideIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { Card, IconTile } from "@/src/design-system/components";
import { GuestPage } from "@/src/design-system/guest-page";
import { useAppTheme } from "@/src/design-system/theme";

export default function PrivacyScreen() {
  return <GuestPage eyebrow="Your information" title="Privacy center" description="See what is shared, with whom, and for how long."><PrivacyRow icon={ShieldCheck} title="Active access" detail="No hotels currently have access" /><PrivacyRow icon={History} title="Sharing history" detail="Review previous consent and access" /><PrivacyRow icon={ShieldX} title="Revoke access" detail="End a hotel’s access immediately" /></GuestPage>;
}
function PrivacyRow({ icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  const { colors } = useAppTheme();
  return <Card><View style={styles.row}><IconTile icon={icon} /><View style={styles.grow}><Text style={[styles.title, { color: colors.foreground }]}>{title}</Text><Text style={[styles.copy, { color: colors.mutedForeground }]}>{detail}</Text></View><Text style={[styles.chevron, { color: colors.mutedForeground }]}>›</Text></View></Card>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: 13 }, grow: { flex: 1, gap: 3 }, title: { fontSize: 15, fontWeight: "700" }, copy: { fontSize: 12, lineHeight: 18 }, chevron: { fontSize: 27, fontWeight: "300" } });
