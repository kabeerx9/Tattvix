import { useAuth, useUser } from "@clerk/clerk-expo";
import { env } from "@tattvix/env/native";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { useRouter } from "expo-router";
import { KeyRound, UserRound } from "lucide-react-native";
import { useState } from "react";
import { getAccountSettings } from "@tattvix/api";
import { StyleSheet, Text, View } from "react-native";

import { Button, LargeTitle, ListRow, Panel, Screen, colors, space, type } from "@/src/design-system";
import { AccountSettingsSections } from "@/src/components/account-settings-sections";
import { NameSheet, PasswordSheet } from "@/src/components/account-sheets";
import { DeleteAccountRow } from "@/src/components/delete-account";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { useCurrentUser } from "@/src/lib/current-user";

// Which build and which backend this phone is talking to: the first thing to
// read out when a hotel reports "it does not work".
function buildFooter() {
  const version = Constants.expoConfig?.version ?? "dev";
  const channel = Updates.channel || "dev";
  const update = Updates.updateId ? ` · update ${Updates.updateId.slice(0, 8)}` : "";
  return `Tattwix ${version} · ${channel}${update}\n${new URL(env.EXPO_PUBLIC_SERVER_URL).host}`;
}

export default function AccountScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const { user } = useUser();
  const currentUser = useCurrentUser();
  const [sheet, setSheet] = useState<"name" | "password" | null>(null);
  if (!currentUser.data) {
    if (currentUser.isError) return <RetryScreen onRetry={() => void currentUser.refetch()} retrying={currentUser.isFetching} />;
    return <PendingScreen />;
  }
  const settings = getAccountSettings(currentUser.data);

  return (
    <Screen>
      <LargeTitle meta={settings.isOwner ? "Your hotels and personal account." : "Your account and personal preferences."}>{settings.isOwner ? "Hotel owner account" : "Account"}</LargeTitle>
      <View style={styles.section}>
        <Panel>
          <ListRow icon={UserRound} title={user?.fullName || "Tattwix account"} detail={user?.primaryEmailAddress?.emailAddress} chevron onPress={() => setSheet("name")} />
          <ListRow icon={KeyRound} title={user?.passwordEnabled ? "Change password" : "Set a password"} chevron onPress={() => setSheet("password")} />
        </Panel>
        <AccountSettingsSections user={currentUser.data} />
        <Button label="Help desk" variant="outline" onPress={() => router.push("/support")} />
        <Button label="Sign out" variant="outline" onPress={() => signOut()} />
        <Panel>
          <DeleteAccountRow />
        </Panel>
      </View>
      <NameSheet open={sheet === "name"} onClose={() => setSheet(null)} />
      <PasswordSheet open={sheet === "password"} onClose={() => setSheet(null)} />
      <Text style={styles.footer} selectable>
        {buildFooter()}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxxl, gap: space.lg },
  footer: { ...type.caption, color: colors.subtleForeground, textAlign: "center", marginTop: space.xxxl },
});
