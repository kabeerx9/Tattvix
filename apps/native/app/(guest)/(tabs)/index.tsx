// Guest home: a greeting, the four guest destinations, and the path to list a
// hotel on the web. Text-first; the web's photo tiles have no bundled source.
import { useUser } from "@clerk/clerk-expo";
import { getGuestOnboarding, onboardingStorageKey } from "@tattvix/api";
import { useQuery } from "@tanstack/react-query";
import { env } from "@tattvix/env/native";
import { useRouter, type Href } from "expo-router";
import { CalendarDays, ShieldCheck, UserRound, UsersRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { Button, LargeTitle, ListRow, Panel, Screen, SectionTitle, colors, space, type } from "@/src/design-system";
import { OnboardingPrompt } from "@/src/components/onboarding";
import { queries } from "@/src/lib/api";
import { dismissOnboarding, readOnboardingDismissal } from "@/src/lib/onboarding";
import { useCurrentUser } from "@/src/lib/current-user";

export default function GuestHome() {
  const { user } = useUser();
  const currentUser = useCurrentUser();
  const profile = useQuery(queries.guestProfile.detail());
  const router = useRouter();
  const name = user?.firstName || user?.username || "Guest";
  const dismissalKey = currentUser.clerkUserId ? onboardingStorageKey(currentUser.clerkUserId, "guest") : null;
  const [dismissed, setDismissed] = useState(() => dismissalKey ? readOnboardingDismissal(dismissalKey) : false);
  useEffect(() => setDismissed(dismissalKey ? readOnboardingDismissal(dismissalKey) : false), [dismissalKey]);
  const guide = profile.data && !profile.isError ? getGuestOnboarding(profile.data) : null;

  return (
    <Screen>
      <LargeTitle meta="Your travel identity, ready before you arrive.">{`Hello, ${name}`}</LargeTitle>

      {guide ? <View style={styles.section}><OnboardingPrompt guide={guide} dismissed={dismissed} onOpen={() => router.push("/(guest)/getting-started" as Href)} onDismiss={() => {
        if (dismissalKey) dismissOnboarding(dismissalKey);
        setDismissed(true);
      }} /></View> : null}

      <View style={styles.section}>
        <Panel>
          <ListRow
            icon={CalendarDays}
            title="My stays"
            detail="See your assigned room, bill, and checkout history."
            chevron
            onPress={() => router.push("/(guest)/stays" as Href)}
          />
          <ListRow
            icon={UserRound}
            title="Travel profile"
            detail="Prepare identity details for a faster check-in."
            chevron
            onPress={() => router.push("/(guest)/profile" as Href)}
          />
          <ListRow
            icon={UsersRound}
            title="Companions"
            detail="Keep accompanying guest profiles together."
            chevron
            onPress={() => router.push("/(guest)/companions" as Href)}
          />
          <ListRow
            icon={ShieldCheck}
            title="Privacy center"
            detail="Review consent and hotel access history."
            chevron
            onPress={() => router.push("/(guest)/privacy" as Href)}
          />
        </Panel>
      </View>

      <View style={styles.section}>
        <SectionTitle>Own a hotel?</SectionTitle>
        <Panel>
          <View style={styles.hotelBody}>
            <Text style={styles.hotelText}>Submit your hotel for approval and track your request on the web.</Text>
            <Button label="List your hotel" variant="outline" onPress={() => void Linking.openURL(`${env.EXPO_PUBLIC_WEB_URL}/register-hotel`)} />
          </View>
        </Panel>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxxl, gap: space.md },
  hotelBody: { padding: space.lg, gap: space.md },
  hotelText: { ...type.meta, color: colors.mutedForeground },
});
