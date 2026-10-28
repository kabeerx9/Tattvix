// Privacy centre: every hotel that has had access to the guest's identity
// details, the current and past stays, and what was viewed and when. Mirrors
// apps/web/src/features/check-in/components/privacy-center-page.tsx.
import {
  checkInKeys,
  describeGuestAccess,
  formatDateTime,
  getGuestAccessAction,
  isHotelAccessOpen,
  type GuestAccessAction,
} from "@tattvix/api";
import type { GuestShare, IdentityAccessAction } from "@tattvix/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BedDouble, Clock3, Eye, FileImage, History, Hotel, ShieldCheck, ShieldOff } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  Kpi,
  KpiRow,
  Panel,
  HeroScreen,
  SectionTitle,
  Spinner,
  StatusPill,
  colors,
  space,
  toast,
  type,
} from "@/src/design-system";
import { api, queries } from "@/src/lib/api";
import { travelImages } from "@/src/lib/travel-images";
import { errorMessage } from "@/src/lib/format";

export default function PrivacyScreen() {
  const queryClient = useQueryClient();
  const query = useQuery({ ...queries.checkIn.shares(), refetchInterval: 30_000 });
  const stays = query.data?.stays ?? [];
  const [revokeTarget, setRevokeTarget] = useState<GuestShare | null>(null);

  const revoke = useMutation({
    mutationFn: (stayId: string) => api.checkIn.revoke(stayId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: checkInKeys.all });
      setRevokeTarget(null);
      toast("Access revoked");
    },
  });

  // Operational status drives current-vs-past: a stay stays "current" until the
  // hotel checks the guest out, whatever its consent status says. Same split the
  // web and the hotel's own history use.
  const currentStays = stays.filter((stay) => stay.operationalStatus !== "CHECKED_OUT");
  const pastStays = stays.filter((stay) => stay.operationalStatus === "CHECKED_OUT");

  function closeRevoke() {
    if (revoke.isPending) return;
    setRevokeTarget(null);
    revoke.reset();
  }

  const renderStay = (stay: GuestShare) => (
    <StayCard
      key={stay.id}
      stay={stay}
      isRevoking={revoke.isPending && revoke.variables === stay.id}
      onAskRevoke={() => {
        revoke.reset();
        setRevokeTarget(stay);
      }}
    />
  );

  return (
    <HeroScreen image={travelImages.privacy} size="page" title="Hotel access history" subtitle="See what is shared, with whom, and for how long." refreshing={query.isFetching && !query.isPending} onRefresh={() => void query.refetch()}>
      {query.isPending ? (
        <View style={styles.center}>
          <Spinner color={colors.mutedForeground} />
        </View>
      ) : query.isError ? (
        <View style={styles.section}>
          <EmptyState
            icon={ShieldCheck}
            text="Your access history could not be loaded."
            action={{ label: "Try again", onPress: () => void query.refetch(), variant: "outline" }}
          />
        </View>
      ) : stays.length === 0 ? (
        <View style={styles.section}>
          <Panel>
            <EmptyState icon={ShieldCheck} text="Nothing shared yet. Saving your profile and documents does not share them. Approved hotel check-ins will appear here." />
          </Panel>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <KpiRow>
              <Kpi label="Current stays" value={currentStays.length} />
              <Kpi label="Past stays" value={pastStays.length} />
              <Kpi label="Revoked" value={stays.filter((stay) => stay.status === "REVOKED").length} />
            </KpiRow>
          </View>

          <View style={styles.section}>
            <SectionTitle>Current stays</SectionTitle>
            <Text style={styles.description}>Your current stays and the identity access you approved.</Text>
            {currentStays.length ? (
              currentStays.map(renderStay)
            ) : (
              <Panel>
                <EmptyState icon={Hotel} text="No active stay right now. Once a hotel checks you in, it will show up here with your room number." />
              </Panel>
            )}
          </View>

          <View style={styles.section}>
            <SectionTitle>Past stays</SectionTitle>
            <Text style={styles.description}>Completed stays, kept for your own record of what was shared and when.</Text>
            {pastStays.length ? (
              pastStays.map(renderStay)
            ) : (
              <Panel>
                <EmptyState icon={History} text="No past stays yet. Past stays will appear here after checkout." />
              </Panel>
            )}
          </View>
        </>
      )}

      <ConfirmSheet
        open={revokeTarget !== null}
        onClose={closeRevoke}
        title={`Revoke ${revokeTarget?.property.name ?? "hotel"} access?`}
        description={
          revoke.isError
            ? errorMessage(revoke.error, "Hotel access could not be revoked.") ?? "Hotel access could not be revoked."
            : "The hotel immediately loses access to your shared identity and document images. Your stay history remains for your own record."
        }
        confirmLabel="Revoke access"
        tone="destructive"
        loading={revoke.isPending}
        onConfirm={() => {
          if (revokeTarget) revoke.mutate(revokeTarget.id);
        }}
      />
    </HeroScreen>
  );
}

const pillTone = { PENDING_CHECK_IN: "warning", CHECKED_IN: "success", CHECKED_OUT: "neutral" } as const;
const operationalLabel = {
  PENDING_CHECK_IN: "Awaiting check-in",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
} as const;

function StayCard({ stay, isRevoking, onAskRevoke }: { stay: GuestShare; isRevoking: boolean; onAskRevoke: () => void }) {
  const access = getGuestAccessAction(stay);
  const accessActive = isHotelAccessOpen(access);
  const activity = groupAccessEvents(stay.accessEvents).slice(0, 8);

  return (
    <Card style={styles.stayCard}>
      <View style={styles.stayHeader}>
        <Hotel color={colors.mutedForeground} size={18} strokeWidth={1.75} style={styles.stayIcon} />
        <View style={styles.stayCopy}>
          <Text style={styles.stayName}>{stay.property.name}</Text>
          <Text style={styles.caption}>
            {stay.property.organization.name}
            {stay.submittedAt ? ` · Shared ${formatDateTime(stay.submittedAt)}` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.pills}>
        <StatusPill tone={pillTone[stay.operationalStatus]}>{operationalLabel[stay.operationalStatus]}</StatusPill>
        <StatusPill tone={stay.status === "REVOKED" ? "destructive" : accessActive ? "success" : "neutral"}>
          {accessActive ? "Identity access active" : statusLabel(access)}
        </StatusPill>
        {stay.room ? (
          <View style={styles.room}>
            <BedDouble color={colors.subtleForeground} size={13} strokeWidth={1.75} />
            <Text style={styles.caption}>Room {stay.room.number}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Stay timeline</Text>
        <DetailLine text={stayTimeline(stay)} />
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Access boundary</Text>
        <DetailLine text={describeGuestAccess(access, { format: formatDateTime })} />
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Recorded activity</Text>
        {activity.length ? (
          activity.map((group, index) => (
            <View key={`${group.lastAt}-${index}`} style={styles.activityRow}>
              {group.action === "DOCUMENT_VIEWED" ? (
                <FileImage color={colors.mutedForeground} size={14} strokeWidth={1.75} style={styles.activityIcon} />
              ) : (
                <Eye color={colors.mutedForeground} size={14} strokeWidth={1.75} style={styles.activityIcon} />
              )}
              <Text style={styles.activityText}>
                {activityLabel(group.action, group.imageSide, group.companionName)}
                {group.count > 1 ? ` ×${group.count}` : ""}
              </Text>
              <Text style={styles.activityTime}>{formatDateTime(group.lastAt)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.caption}>No hotel identity views have been recorded.</Text>
        )}
      </View>

      {access.kind === "revocable" ? (
        <View style={styles.revoke}>
          <Button
            label="Revoke access"
            icon={ShieldOff}
            variant="outline"
            size="sm"
            loading={isRevoking}
            onPress={onAskRevoke}
          />
        </View>
      ) : null}
    </Card>
  );
}

function DetailLine({ text }: { text: string }) {
  return (
    <View style={styles.detailLine}>
      <Clock3 color={colors.mutedForeground} size={14} strokeWidth={1.75} style={styles.activityIcon} />
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );
}

function stayTimeline(stay: GuestShare) {
  if (stay.checkedOutAt) return `Checked out ${formatDateTime(stay.checkedOutAt)}`;
  if (stay.checkedInAt) return `Checked in ${formatDateTime(stay.checkedInAt)}`;
  return "Not checked in yet";
}

type AccessEvent = GuestShare["accessEvents"][number];

type AccessEventGroup = {
  action: IdentityAccessAction;
  imageSide: "FRONT" | "BACK" | null;
  companionName?: string | null;
  count: number;
  lastAt: string;
};

// Collapse repeat views per record: a review session opens details plus each
// image, and refetches audit again. The guest wants "how often was each record
// opened", not every issuance row.
function groupAccessEvents(events: AccessEvent[]): AccessEventGroup[] {
  const groups = new Map<string, AccessEventGroup>();
  for (const event of events) {
    const key = `${event.action}:${event.imageSide ?? ""}:${event.companionId ?? 0}`;
    const current = groups.get(key);
    if (current) {
      current.count += 1;
      if (new Date(event.createdAt).getTime() > new Date(current.lastAt).getTime()) current.lastAt = event.createdAt;
    } else {
      groups.set(key, {
        action: event.action,
        imageSide: event.imageSide,
        companionName: event.companionId ? event.companionName || "Companion" : null,
        count: 1,
        lastAt: event.createdAt,
      });
    }
  }
  return [...groups.values()];
}

function activityLabel(action: IdentityAccessAction, side: "FRONT" | "BACK" | null, companionName?: string | null) {
  if (action === "DOCUMENT_VIEWED") {
    return `${companionName ? `${companionName}: ` : ""}${side === "BACK" ? "Back" : "Front"} document image opened`;
  }
  if (action === "DETAILS_VIEWED") return "Identity details opened";
  if (action === "STAY_CLOSED") return "Hotel finished identity review";
  return "Consent revoked";
}

function statusLabel(access: GuestAccessAction) {
  if (access.kind === "ended" && access.reason === "revoked") return "Consent revoked";
  if (access.kind === "not-shared") return "Not shared";
  return "Access ended";
}

const styles = StyleSheet.create({
  center: { alignItems: "center", paddingVertical: space.xxxl },
  section: { marginTop: space.xxl, gap: space.md },
  description: { ...type.caption, color: colors.subtleForeground, marginTop: -space.xs },
  stayCard: { gap: space.lg, padding: space.lg },
  stayHeader: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  stayIcon: { marginTop: 2 },
  stayCopy: { flex: 1, gap: 2 },
  stayName: { ...type.rowTitle, color: colors.foreground },
  caption: { ...type.caption, color: colors.mutedForeground },
  pills: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm },
  room: { flexDirection: "row", alignItems: "center", gap: 4 },
  block: { gap: space.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSoft, paddingTop: space.md },
  label: { ...type.label, color: colors.subtleForeground },
  detailLine: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  detailText: { ...type.caption, color: colors.mutedForeground, flex: 1 },
  activityRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, paddingVertical: 2 },
  activityIcon: { marginTop: 2 },
  activityText: { ...type.caption, color: colors.mutedForeground, flex: 1 },
  activityTime: { ...type.caption, color: colors.mutedForeground, fontVariant: ["tabular-nums"] },
  revoke: { alignSelf: "flex-start" },
});
