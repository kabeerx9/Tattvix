// Guest home, status first: the current stay when there is one, otherwise
// whether the travel profile is ready for check-in. Mirrors
// apps/web/src/routes/_auth/guest.tsx. Stays, Profile and Privacy are tabs;
// Companions has no tab, so its row stays here.
import { useUser } from "@clerk/clerk-expo";
import { formatDateTime, getCurrentGuestStay, stayStatusLabel } from "@tattvix/api";
import { guestProfileMissingFieldSchema, type GuestShare } from "@tattvix/contracts";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { UsersRound } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { Button, Card, LargeTitle, ListRow, Panel, Screen, Spinner, StatusPill, colors, radii, space, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";

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
    <Screen
      refreshing={(stays.isFetching && !stays.isPending) || (profile.isFetching && !profile.isPending)}
      onRefresh={() => {
        void stays.refetch();
        void profile.refetch();
      }}
    >
      <LargeTitle>{`Hello, ${name}`}</LargeTitle>

      <View style={styles.section}>
        {loading ? (
          <View style={styles.center}>
            <Spinner color={colors.mutedForeground} />
          </View>
        ) : stay ? (
          <StayCard stay={stay} onPress={() => router.push(`/(guest)/stays/${stay.id}` as Href)} />
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
      </View>

      <View style={styles.section}>
        <Panel>
          <ListRow icon={UsersRound} title="Companions" detail="People you travel with" chevron onPress={() => router.push("/(guest)/companions" as Href)} />
        </Panel>
      </View>
    </Screen>
  );
}

function StayCard({ stay, onPress }: { stay: GuestShare; onPress: () => void }) {
  const waiting = stay.operationalStatus === "PENDING_CHECK_IN";
  const when = waiting
    ? stay.submittedAt ? `Requested ${formatDateTime(stay.submittedAt)}` : null
    : stay.checkedInAt ? `Checked in ${formatDateTime(stay.checkedInAt)}` : null;
  return (
    <Card onPress={onPress} accessibilityLabel={`${stay.property.name}, ${stayStatusLabel(stay.operationalStatus)}`}>
      <Text style={styles.eyebrow}>Your stay</Text>
      <Text style={styles.title}>{stay.property.name}</Text>
      <View style={styles.pill}>
        <StatusPill tone={waiting ? "warning" : "success"}>{stayStatusLabel(stay.operationalStatus)}</StatusPill>
      </View>
      <Text style={styles.body}>{stay.room ? `Room ${stay.room.number}` : "Reception will assign your room."}</Text>
      {when ? <Text style={styles.meta}>{when}</Text> : null}
    </Card>
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
  section: { marginTop: space.xxl, gap: space.md },
  center: { alignItems: "center", paddingVertical: space.xxxl },
  eyebrow: { ...type.label, color: colors.subtleForeground },
  title: { ...type.cardTitle, color: colors.foreground, marginTop: space.xs },
  gapTop: { marginTop: space.md },
  pill: { marginTop: space.sm },
  body: { ...type.body, color: colors.foreground, marginTop: space.sm },
  meta: { ...type.meta, color: colors.mutedForeground, marginTop: space.xs },
  track: { height: 6, borderRadius: radii.pill, backgroundColor: colors.muted, marginTop: space.md, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radii.pill, backgroundColor: colors.primary },
  action: { marginTop: space.lg },
});
