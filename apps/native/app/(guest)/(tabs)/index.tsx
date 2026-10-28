// Guest home, status first: the current stay as a keycard to turn over when there is one, otherwise
// whether the travel profile is ready for check-in. Mirrors
// apps/web/src/routes/_auth/guest.tsx. Stays, Profile and Privacy are tabs;
// Companions has no tab, so its row stays here.
import { useUser } from "@clerk/clerk-expo";
import { getCurrentGuestStay, getGuestKeyCard } from "@tattvix/api";
import { guestProfileMissingFieldSchema } from "@tattvix/contracts";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { Rotate3d, UsersRound } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { GuestKeyCard } from "@/src/components/guest-key-card";
import { Button, Card, Enter, HeroScreen, ListRow, Panel, Spinner, StatusPill, TextLink, colors, radii, space, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import { travelImages } from "@/src/lib/travel-images";

const requiredFieldCount = guestProfileMissingFieldSchema.options.length;

export default function GuestHome() {
  const { user } = useUser();
  const router = useRouter();
  const stays = useQuery({ ...queries.checkIn.shares(), refetchInterval: 30_000 });
  const profile = useQuery(queries.guestProfile.detail());
  const name = user?.firstName || user?.username || "Guest";
  const stay = stays.data ? getCurrentGuestStay(stays.data.stays) : null;
  const loading = stays.isPending || (!stay && profile.isPending);

  return (
    <HeroScreen
      image={travelImages.home}
      title={`Hello, ${name}`}
      refreshing={(stays.isFetching && !stays.isPending) || (profile.isFetching && !profile.isPending)}
      onRefresh={() => {
        void stays.refetch();
        void profile.refetch();
      }}
    >
      <Enter style={styles.first}>
        {loading ? (
          <View style={styles.center}>
            <Spinner color={colors.mutedForeground} />
          </View>
        ) : stay ? (
          <>
            <GuestKeyCard card={getGuestKeyCard(stay)} />
            <View style={styles.cardFoot}>
              <View style={styles.hint}>
                <Rotate3d color={colors.subtleForeground} size={14} strokeWidth={1.8} />
                <Text style={styles.hintText}>Tap or swipe to turn</Text>
              </View>
              <TextLink label="Stay details" onPress={() => router.push(`/(guest)/stays/${stay.id}` as Href)} />
            </View>
          </>
        ) : profile.data ? (
          <ReadinessCard missing={profile.data.readiness.missingFields.length} onOpenProfile={() => router.push("/(guest)/profile" as Href)} />
        ) : (
          <Card>
            <Text style={styles.body}>Your profile could not be loaded.</Text>
            <View style={styles.action}>
              <Button label="Try again" variant="outline" onPress={() => void profile.refetch()} />
            </View>
          </Card>
        )}
      </Enter>

      <Enter index={1} style={styles.section}>
        <Panel>
          <ListRow icon={UsersRound} title="Companions" detail="People you travel with" chevron onPress={() => router.push("/(guest)/companions" as Href)} />
        </Panel>
      </Enter>
    </HeroScreen>
  );
}

function ReadinessCard({ missing, onOpenProfile }: { missing: number; onOpenProfile: () => void }) {
  if (missing === 0) {
    return (
      <Card>
        <StatusPill tone="success">Ready for check-in</StatusPill>
        <Text style={[styles.title, styles.gapTop]}>You're ready</Text>
        <Text style={styles.body}>Scan the hotel's check-in QR at reception.</Text>
      </Card>
    );
  }
  const completed = requiredFieldCount - missing;
  const percentage = Math.round((completed / requiredFieldCount) * 100);
  return (
    <Card>
      <Text style={styles.title}>Finish your travel profile</Text>
      <Text style={styles.meta}>
        {percentage}% · {completed} of {requiredFieldCount} requirements
      </Text>
      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percentage }}>
        <View style={[styles.fill, { width: `${percentage}%` }]} />
      </View>
      <View style={styles.action}>
        <Button label="Open profile" onPress={onOpenProfile} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  first: { gap: space.md },
  section: { marginTop: space.xxl, gap: space.md },
  center: { alignItems: "center", paddingVertical: space.xxxl },
  cardFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.xs },
  hint: { flexDirection: "row", alignItems: "center", gap: 6 },
  hintText: { ...type.meta, fontSize: 12, color: colors.subtleForeground },
  title: { ...type.cardTitle, color: colors.foreground, marginTop: space.xs },
  gapTop: { marginTop: space.md },
  body: { ...type.body, color: colors.foreground, marginTop: space.sm },
  meta: { ...type.meta, color: colors.mutedForeground, marginTop: space.xs },
  track: { height: 6, borderRadius: radii.pill, backgroundColor: colors.muted, marginTop: space.md, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radii.pill, backgroundColor: colors.primary },
  action: { marginTop: space.lg },
});
