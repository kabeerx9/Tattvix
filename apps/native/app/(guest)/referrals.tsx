import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  buildReferralLink,
  classifyApiError,
  createReferralCodeMutation,
  formatDateTime,
  getAccountSettings,
  referralDashboardQuery,
} from "@tattvix/api";
import { env } from "@tattvix/env/native";
import { Share, StyleSheet, Text, View } from "react-native";
import { UsersRound } from "lucide-react-native";
import {
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  LargeTitle,
  Screen,
  SecondaryHeader,
  StatusPill,
  TextLink,
  colors,
  space,
  type,
} from "@/src/design-system";
import { api } from "@/src/lib/api";
import { useCurrentUser } from "@/src/lib/current-user";
import { PendingScreen } from "@/src/components/status-screens";

export default function ReferralsScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const ownerId = user.data?.id ?? 0;
  const allowed = getAccountSettings(user.data ?? null).isOwner;
  const client = useQueryClient();
  const [cursors, setCursors] = useState<(number | undefined)[]>([undefined]);
  const [shareError, setShareError] = useState("");
  const query = useQuery({
    ...referralDashboardQuery(
      api.referrals,
      ownerId,
      cursors[cursors.length - 1],
    ),
    enabled: allowed,
  });
  const create = useMutation(
    createReferralCodeMutation(api.referrals, client, ownerId),
  );
  if (!user.data) return <PendingScreen />;
  if (!allowed)
    return (
      <Screen>
        <SecondaryHeader title="Referrals" onBack={() => router.back()} />
        <Text style={styles.meta}>Only hotel owners can view referrals.</Text>
      </Screen>
    );
  const data = query.data;
  const link = data?.code
    ? buildReferralLink(env.EXPO_PUBLIC_WEB_URL, data.code)
    : "";
  return (
    <Screen
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <SecondaryHeader title="Account" onBack={() => router.back()} />
      <LargeTitle
        meta="Hotel registrations made with your code"
        action={
          <TextLink label="Refresh" onPress={() => void query.refetch()} />
        }
      >
        Referrals
      </LargeTitle>
      {query.isPending ? (
        <Text style={styles.meta}>Loading referrals...</Text>
      ) : query.isError ? (
        <Card style={styles.card}>
          <Text accessibilityRole="alert" style={styles.error}>
            {classifyApiError(query.error).message}
          </Text>
          <Button
            label="Try again"
            variant="outline"
            onPress={() => void query.refetch()}
          />
        </Card>
      ) : data ? (
        <>
          <Card style={styles.card}>
            <Text style={styles.title}>Invite a hotel owner</Text>
            <Text style={styles.meta}>
              Share your link or code. The owner can include it when registering
              their hotel.
            </Text>
            {data.code ? (
              <>
                <Text
                  selectable
                  accessibilityLabel={`Referral code ${data.code}`}
                  style={styles.code}
                >
                  {data.code}
                </Text>
                <Text selectable style={styles.meta}>
                  {link}
                </Text>
                <Button
                  label="Share referral link"
                  onPress={async () => {
                    setShareError("");
                    try {
                      await Share.share({
                        message: `Register your hotel on Tattwix: ${link}\nReferral code: ${data.code}`,
                      });
                    } catch {
                      setShareError(
                        "Could not open sharing. Select the link above to copy.",
                      );
                    }
                  }}
                />
              </>
            ) : (
              <Button
                label="Create referral link"
                loading={create.isPending}
                onPress={() => create.mutate()}
              />
            )}
            {create.isError || shareError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {shareError || classifyApiError(create.error).message}
              </Text>
            ) : null}
          </Card>
          <View style={styles.card}>
            <KpiRow>
              <Kpi label="Registrations" value={data.summary.total} />
              <Kpi label="Pending" value={data.summary.pending} />
            </KpiRow>
            <KpiRow>
              <Kpi label="Approved" value={data.summary.approved} />
              <Kpi label="Rejected" value={data.summary.rejected} />
            </KpiRow>
          </View>
          <View style={styles.card}>
            <Text style={styles.title}>Referred registrations</Text>
            {data.registrations.length ? (
              data.registrations.map((item) => (
                <Card key={item.id} style={styles.entry}>
                  <Text style={styles.title}>{item.hotelName}</Text>
                  <StatusPill
                    tone={
                      item.status === "APPROVED"
                        ? "success"
                        : item.status === "PENDING"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {item.status === "APPROVED"
                      ? "Approved"
                      : item.status === "PENDING"
                        ? "Pending"
                        : "Rejected"}
                  </StatusPill>
                  <Text style={styles.meta}>
                    Submitted {formatDateTime(item.submittedAt)}
                    {item.reviewedAt
                      ? ` · Reviewed ${formatDateTime(item.reviewedAt)}`
                      : ""}
                  </Text>
                </Card>
              ))
            ) : (
              <EmptyState
                icon={UsersRound}
                text="No referred registrations yet. Registrations made using your code will appear here."
              />
            )}
          </View>
          {cursors.length > 1 || data.nextCursor !== null ? (
            <View style={styles.pages}>
              <Button
                label="Previous"
                variant="outline"
                disabled={cursors.length === 1 || query.isFetching}
                onPress={() => setCursors(cursors.slice(0, -1))}
              />
              <Button
                label="Next"
                variant="outline"
                disabled={data.nextCursor === null || query.isFetching}
                onPress={() =>
                  data.nextCursor !== null &&
                  setCursors([...cursors, data.nextCursor])
                }
              />
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { marginTop: space.xl, gap: space.md },
  entry: { gap: space.md },
  title: { ...type.cardTitle, color: colors.foreground },
  meta: { ...type.caption, color: colors.mutedForeground },
  code: { ...type.pageTitle, letterSpacing: 2, color: colors.foreground },
  error: { ...type.caption, color: colors.destructive },
  pages: {
    marginTop: space.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.sm,
  },
});
