import { UserRoundPlus } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { AppButton, Card, IconTile } from "@/src/design-system/components";
import { GuestPage } from "@/src/design-system/guest-page";
import { useAppTheme } from "@/src/design-system/theme";

export default function CompanionsScreen() {
  const { colors } = useAppTheme();
  return <GuestPage eyebrow="Travel together" title="Companions" description="Save accompanying guest profiles so group check-in takes less time."><Card><View style={styles.empty}><IconTile icon={UserRoundPlus} /><Text style={[styles.title, { color: colors.foreground }]}>Add your first companion</Text><Text style={[styles.copy, { color: colors.mutedForeground }]}>Keep family or frequent travel companions ready for future stays.</Text><View style={styles.button}><AppButton label="Add companion" onPress={() => {}} /></View></View></Card></GuestPage>;
}
const styles = StyleSheet.create({ empty: { alignItems: "center", paddingVertical: 24, gap: 9 }, title: { marginTop: 6, fontSize: 17, fontWeight: "700" }, copy: { maxWidth: 280, textAlign: "center", fontSize: 13, lineHeight: 19 }, button: { minWidth: 170, marginTop: 12 } });
