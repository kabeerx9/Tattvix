import { FileBadge2, UserRound } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { AppButton, Card, IconTile } from "@/src/design-system/components";
import { GuestPage } from "@/src/design-system/guest-page";
import { useAppTheme } from "@/src/design-system/theme";

export default function ProfileScreen() {
  const { colors } = useAppTheme();
  return <GuestPage eyebrow="Guest identity" title="Travel profile" description="Keep the essentials ready and choose what is shared at check-in."><Card><View style={styles.row}><IconTile icon={UserRound} /><View style={styles.grow}><Text style={[styles.title, { color: colors.foreground }]}>Personal details</Text><Text style={[styles.copy, { color: colors.mutedForeground }]}>Name, contact details, nationality, and preferences.</Text></View><Text style={[styles.status, { color: colors.success }]}>Ready</Text></View></Card><Card><View style={styles.row}><IconTile icon={FileBadge2} /><View style={styles.grow}><Text style={[styles.title, { color: colors.foreground }]}>Identity document</Text><Text style={[styles.copy, { color: colors.mutedForeground }]}>Add a verified document before arrival.</Text></View></View><View style={styles.action}><AppButton label="Add document" onPress={() => {}} variant="outline" /></View></Card></GuestPage>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: 13 }, grow: { flex: 1, gap: 3 }, title: { fontSize: 15, fontWeight: "700" }, copy: { fontSize: 12, lineHeight: 18 }, status: { fontSize: 12, fontWeight: "700" }, action: { marginTop: 18 } });
