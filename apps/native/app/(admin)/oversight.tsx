// Oversight: read-only and privacy-constrained. Stay counts per property,
// weekly check-ins per property and the audit trail (who viewed identity
// details, platform admin actions). Never a document image, number or URL.
import { AUDIT_ACTIONS, auditActionLabel, auditKindLabel, auditTarget, buildWeeklyCheckInsGrid } from "@tattvix/api";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ClipboardList, Hotel, LineChart, ShieldAlert } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { EmptyState, LargeTitle, ListRow, Panel, PillTabs, Screen, SecondaryHeader, SectionTitle, StatusPill, TextField, colors, space, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import { errorMessage, formatDateTime } from "@/src/lib/format";

const WEEKLY_CHECK_INS_WEEKS = 8;
const AUDIT_LIMIT = 50;
const ALL_ACTIONS = "all";
const DEBOUNCE_MS = 300;

const weekFormat = new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric" });
const formatWeekStart = (weekStart: string) => weekFormat.format(new Date(`${weekStart}T12:00:00`));

export default function OversightScreen() {
  const router = useRouter();
  const stays = useQuery(queries.platformOversight.stays());
  const weekly = useQuery(queries.platformOversight.weeklyCheckIns({ weeks: WEEKLY_CHECK_INS_WEEKS }));
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [slugFilter, setSlugFilter] = useState("");
  const [action, setAction] = useState(ALL_ACTIONS);
  useEffect(() => {
    const timer = setTimeout(() => setSlugFilter(organizationSlug.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [organizationSlug]);
  const audit = useQuery(
    queries.platformOversight.audit({ organizationSlug: slugFilter || undefined, action: action === ALL_ACTIONS ? undefined : action, limit: AUDIT_LIMIT }),
  );

  const core = [stays, weekly];
  const refetchAll = () => [...core, audit].forEach((query) => void query.refetch());

  if (!stays.data || !weekly.data) {
    if (core.some((query) => query.isError)) return <RetryScreen onRetry={refetchAll} retrying={core.some((query) => query.isFetching)} />;
    return <PendingScreen />;
  }

  const properties = stays.data.properties;
  const grid = buildWeeklyCheckInsGrid(weekly.data.rows);
  const entries = audit.data?.entries ?? [];

  return (
    <Screen refreshing={[...core, audit].some((query) => query.isFetching && !query.isPending)} onRefresh={refetchAll}>
      <SecondaryHeader title="Oversight" onBack={() => router.back()} />
      <LargeTitle>Oversight</LargeTitle>

      <View style={styles.section}>
        <SectionTitle meta="Stay counts across active properties.">Stays overview</SectionTitle>
        {properties.length ? (
          <Panel>
            {properties.map((property) => (
              <ListRow
                key={property.propertyId}
                title={property.propertyName}
                detail={`${property.organizationName}\n${property.statusCounts.pendingCheckIn} pending · ${property.statusCounts.checkedIn} in house · ${property.statusCounts.checkedOut} checked out`}
                detailLines={2}
                trailing={<Trailing value={property.totalStays} caption="stays" />}
              />
            ))}
          </Panel>
        ) : (
          <EmptyState icon={Hotel} text="No active properties yet. Onboard a hotel to see stay activity here." />
        )}
      </View>

      <View style={styles.section}>
        <SectionTitle meta={`${WEEKLY_CHECK_INS_WEEKS} weeks`}>Weekly check-ins</SectionTitle>
        {grid.properties.length && grid.weeks.length ? (
          <Panel>
            {grid.properties.map((property) => (
              <View key={`${property.organizationSlug}-${property.propertyId}`} style={styles.weeklyRow}>
                <ListRow title={property.propertyName} detail={property.organizationSlug} trailing={<Trailing value={property.total} caption="check-ins" />} />
                <View style={styles.sparkline} accessible accessibilityLabel={`Check-ins per week, oldest first: ${grid.weeks.map((week) => `${formatWeekStart(week)} ${property.byWeek.get(week) ?? 0}`).join(", ")}`}>
                  {grid.weeks.map((week) => {
                    const checkIns = property.byWeek.get(week) ?? 0;
                    const height = grid.maxCheckIns > 0 ? Math.max((checkIns / grid.maxCheckIns) * 100, checkIns > 0 ? 12 : 0) : 0;
                    return (
                      <View key={week} style={styles.bar}>
                        <View style={[styles.barFill, { height: `${height}%` }]} />
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </Panel>
        ) : (
          <EmptyState icon={LineChart} text="No check-ins recorded yet. Check-in a guest at any property to see the weekly trend here." />
        )}
      </View>

      <View style={styles.section}>
        <SectionTitle>Audit trail</SectionTitle>
        <TextField value={organizationSlug} onChangeText={setOrganizationSlug} placeholder="Filter by organization slug" accessibilityLabel="Filter by organization slug" autoCapitalize="none" autoCorrect={false} enter="done" />
        <PillTabs items={AUDIT_ACTIONS.map((option) => ({ key: option.value || ALL_ACTIONS, label: option.label }))} value={action} onChange={setAction} />
        {audit.isPending ? (
          <Text style={styles.loading}>Loading audit events...</Text>
        ) : audit.isError ? (
          <EmptyState
            icon={ShieldAlert}
            text={errorMessage(audit.error, "The audit trail could not be loaded.") ?? "The audit trail could not be loaded."}
            action={{ label: audit.isFetching ? "Retrying..." : "Retry", onPress: () => void audit.refetch() }}
          />
        ) : entries.length ? (
          <Panel>
            {entries.map((entry) => (
              <ListRow
                key={entry.id}
                title={auditActionLabel(entry.action)}
                detail={`${entry.actorEmail}\n${auditTarget(entry)}\n${formatDateTime(entry.at)}`}
                detailLines={3}
                trailing={<StatusPill tone="neutral">{auditKindLabel(entry.kind)}</StatusPill>}
              />
            ))}
          </Panel>
        ) : (
          <EmptyState icon={ClipboardList} text="No audit events match these filters. Clear the filters, or check back after the next platform action." />
        )}
      </View>
    </Screen>
  );
}

function Trailing({ value, caption }: { value: number; caption: string }) {
  return (
    <View style={styles.trailing}>
      <Text style={styles.trailingValue}>{value}</Text>
      <Text style={styles.trailingCaption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxxl, gap: space.md },
  trailing: { alignItems: "flex-end" },
  trailingValue: { ...type.rowTitle, color: colors.foreground, fontVariant: ["tabular-nums"] },
  trailingCaption: { ...type.caption, color: colors.subtleForeground },
  weeklyRow: { paddingBottom: space.md },
  // The first chart series may use the accent (design doc, colour).
  sparkline: { flexDirection: "row", alignItems: "flex-end", gap: space.xs, height: 32, marginHorizontal: space.lg },
  bar: { flex: 1, height: "100%", justifyContent: "flex-end", backgroundColor: colors.muted, borderRadius: 3, overflow: "hidden" },
  barFill: { width: "100%", backgroundColor: colors.primary, borderRadius: 3 },
  loading: { ...type.meta, color: colors.mutedForeground, paddingVertical: space.lg },
});
