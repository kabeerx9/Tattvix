import { useAuth, useUser } from "@clerk/clerk-expo";
import { StyleSheet, Text, View } from "react-native";
import { AppButton, Card } from "@/src/design-system/components";
import { GuestPage } from "@/src/design-system/guest-page";
import { useAppTheme } from "@/src/design-system/theme";

export default function AccountScreen() { const { signOut } = useAuth(); const { user } = useUser(); const { colors } = useAppTheme(); return <GuestPage eyebrow="Preferences" title="Account" description="Manage your Tattvix account and mobile preferences."><Card><View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={[styles.initial, { color: colors.primaryForeground }]}>{(user?.firstName || user?.primaryEmailAddress?.emailAddress || "T").charAt(0).toUpperCase()}</Text></View><Text style={[styles.name, { color: colors.foreground }]}>{user?.fullName || "Tattvix guest"}</Text><Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.primaryEmailAddress?.emailAddress}</Text></Card><Card style={styles.actions}><AppButton label="Sign out" onPress={() => signOut()} variant="outline" /></Card></GuestPage>; }
const styles = StyleSheet.create({ avatar: { width: 58, height: 58, alignItems: "center", justifyContent: "center", borderRadius: 18 }, initial: { fontSize: 22, fontWeight: "800" }, name: { marginTop: 14, fontSize: 17, fontWeight: "700" }, email: { marginTop: 3, fontSize: 13 }, actions: { gap: 10 } });
