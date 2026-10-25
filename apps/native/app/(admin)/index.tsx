// Platform: the Tattwix-wide, read-only view for platform admins. Totals, the
// hotels that still need setup, every hotel's subscription and weekly check-ins.
import { formatMoneyWholeRupees, formatPercent, getMissingSetup, getOccupancyTonight, getPortfolioTotals, getSetupStatus } from "@tattvix/api";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Menu } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PlaceSwitcherSheet } from "@/src/components/PlaceSwitcher";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { EmptyState, Kpi, KpiRow, LargeTitle, ListRow, Panel, Screen, SectionTitle, StatusPill, colors, space, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";

const MAX_ATTENTION_ROWS = 8;
const CHECK_IN_WEEKS = 6;

const weekFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

export default function PlatformScreen() {
  const portfolio = useQuery(queries.platformPortfolio.list());
  const checkIns = useQuery(queries.platformOversight.weeklyCheckIns({ weeks: CHECK_IN_WEEKS }));
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const core = [portfolio, checkIns];
  const refetchAll = () => core.forEach((query) => void query.refetch());

  if (!portfolio.data || !checkIns.data) {
    if (core.some((query) => query.isError)) return <RetryScreen onRetry={refetchAll} retrying={core.some((query) => query.isFetching)} />;
    return <PendingScreen />;
  }

  const properties = portfolio.data.properties;
  const totals = getPortfolioTotals(properties);
  const byName = [...properties].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  const attention = byName.map((property) => ({ property, status: getSetupStatus(property) })).filter(({ status }) => status.tone !== "success");
  const weeks = weeklyTotals(checkIns.data.rows);

  return (
    <Screen refreshing={core.some((query) => query.isFetching && !query.isPending)} onRefresh={refetchAll}>
      <LargeTitle
        meta={`${count(totals.properties, "property", "properties")} · ${count(totals.organizations, "organization", "organizations")}`}
        action={
          <Pressable accessibilityRole="button" accessibilityLabel="Switch place" hitSlop={12} onPress={() => setSwitcherOpen(true)}>
            <Menu color={colors.foreground} size={24} strokeWidth={1.6} />
          </Pressable>
        }
      >
        Platform
      </LargeTitle>

      <View style={styles.kpis}>
        <KpiRow>
          <Kpi label="Properties" value={totals.properties} />
          <Kpi label="Rooms" value={totals.rooms} />
        </KpiRow>
        <KpiRow>
          <Kpi label="Occupancy tonight" value={formatPercent(totals.occupancyTonight)} />
          <Kpi label="In house" value={totals.inHouse} />
        </KpiRow>
        <KpiRow>
          <Kpi label="Check-ins · 7 days" value={totals.checkInsLast7Days} />
          <Kpi label="Revenue · 30 days" value={formatMoneyWholeRupees(totals.revenueLast30DaysMinor)} />
        </KpiRow>
      </View>

      <View style={styles.section}>
        <SectionTitle>Needs attention</SectionTitle>
        {attention.length ? (
          <Panel>
            {attention.slice(0, MAX_ATTENTION_ROWS).map(({ property, status }) => {
              const missing = getMissingSetup(property);
              const organization = property.organization.name;
              return (
                <ListRow
                  key={property.id}
                  title={property.name}
                  detail={missing.length ? `${organization} · missing ${missing.join(", ")}` : `${organization} · switched off`}
                  trailing={<StatusPill tone={status.tone}>{status.label}</StatusPill>}
                />
              );
            })}
          </Panel>
        ) : (
          <Panel>
            <ListRow title="All hotels are live" />
          </Panel>
        )}
      </View>

      <View style={styles.section}>
        <SectionTitle>Hotels</SectionTitle>
        <Panel>
          {byName.map((property) => {
            const { subscription } = property.organization;
            return (
              <ListRow
                key={property.id}
                title={property.name}
                detail={`${property.organization.name} · ${formatPercent(getOccupancyTonight(property))} tonight · ${count(property.rooms.total, "room", "rooms")}`}
                trailing={subscription.entitled ? <StatusPill tone="success">Active</StatusPill> : <StatusPill tone="warning">{titleCase(subscription.status)}</StatusPill>}
              />
            );
          })}
        </Panel>
      </View>

      <View style={styles.section}>
        <SectionTitle>Check-ins by week</SectionTitle>
        {weeks.length ? (
          <Panel>
            {weeks.map((week) => (
              <ListRow key={week.weekStart} title={weekLabel(week.weekStart)} trailing={<Text style={styles.count}>{week.count}</Text>} />
            ))}
          </Panel>
        ) : (
          <EmptyState icon={CalendarDays} text="No check-ins yet" />
        )}
      </View>

      <PlaceSwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} current={{ kind: "admin" }} />
    </Screen>
  );
}

/** Sums each week across every hotel, newest week first. */
function weeklyTotals(rows: readonly { weekStart: string; checkIns: number }[]) {
  const byWeek = new Map<string, number>();
  for (const row of rows) byWeek.set(row.weekStart, (byWeek.get(row.weekStart) ?? 0) + row.checkIns);
  return [...byWeek.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([weekStart, checkIns]) => ({ weekStart, count: checkIns }));
}

// Date-only strings parse as UTC; noon local keeps the label on the right day.
function weekLabel(weekStart: string) {
  return `Week of ${weekFormat.format(new Date(`${weekStart}T12:00:00`))}`;
}

function count(value: number, one: string, many: string) {
  return `${value} ${value === 1 ? one : many}`;
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const styles = StyleSheet.create({
  kpis: { marginTop: space.xl, gap: space.md },
  section: { marginTop: space.xxxl, gap: space.md },
  count: { ...type.body, color: colors.foreground, fontVariant: ["tabular-nums"] },
});
