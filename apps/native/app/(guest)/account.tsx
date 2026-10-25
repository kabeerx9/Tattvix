import { useAuth, useUser } from "@clerk/clerk-expo";
import { UserRound } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { Button, LargeTitle, ListRow, Panel, Screen, space } from "@/src/design-system";

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxxl, gap: space.lg },
});
