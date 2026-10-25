import { useAuth, useUser } from "@clerk/clerk-expo";
import { env } from "@tattvix/env/native";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { UserRound } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { Button, LargeTitle, ListRow, Panel, Screen, colors, space, type } from "@/src/design-system";

// Which build and which backend this phone is talking to: the first thing to
// read out when a hotel reports "it does not work".
function buildFooter() {
  const version = Constants.expoConfig?.version ?? "dev";
  const channel = Updates.channel || "dev";
  const update = Updates.updateId ? ` · update ${Updates.updateId.slice(0, 8)}` : "";
  return `Tattwix ${version} · ${channel}${update}\n${new URL(env.EXPO_PUBLIC_SERVER_URL).host}`;
}

// Real account data from Clerk only. Sign out is the one working action here.
export default function AccountScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();

  return (
    <Screen>
      <LargeTitle meta="Manage your Tattwix account and mobile preferences.">Account</LargeTitle>
      <View style={styles.section}>
        <Panel>
          <ListRow icon={UserRound} title={user?.fullName || "Tattwix guest"} detail={user?.primaryEmailAddress?.emailAddress} />
        </Panel>
        <Button label="Sign out" variant="outline" onPress={() => signOut()} />
      </View>
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
