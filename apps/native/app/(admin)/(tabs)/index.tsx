// Platform: the Tattwix-wide overview for platform admins. Totals, what needs
// attention (billing, quiet hotels, unfinished setup) and weekly check-ins.
// Every row opens its organization; Oversight is pushed from the title.
import { formatMoneyWholeRupees, formatPercent, getMissingSetup, getPortfolioAttention, getPortfolioTotals, getSetupStatus } from "@tattvix/api";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { CalendarDays } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { AttentionGroups, count, organizationHref } from "@/src/components/admin-portfolio";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { EmptyState, Kpi, KpiRow, LargeTitle, ListRow, Panel, Screen, SectionTitle, StatusPill, TextLink, colors, space, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";

const MAX_ATTENTION_ROWS = 8;
const CHECK_IN_WEEKS = 6;

const weekFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

export default function PlatformScreen() {
  const router = useRouter();
  const portfolio = useQuery(queries.platformPortfolioContacts.list());
  const checkIns = useQuery(queries.platformOversight.weeklyCheckIns({ weeks: CHECK_IN_WEEKS }));

  const core = [portfolio, checkIns];
  const refetchAll = () => core.forEach((query) => void query.refetch());

  if (!portfolio.data || !checkIns.data) {
    if (core.some((query) => query.isError)) return <RetryScreen onRetry={refetchAll} retrying={core.some((query) => query.isFetching)} />;
    return <PendingScreen />;
  }

  const properties = portfolio.data.properties;
  const totals = getPortfolioTotals(properties);
  const attention = getPortfolioAttention(properties);
  const byName = [...properties].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  const setup = byName.map((property) => ({ property, status: getSetupStatus(property) })).filter(({ status }) => status.tone !== "success");
  const weeks = weeklyTotals(checkIns.data.rows);
  const openOrganization = (slug: string) => router.push(organizationHref(slug));

  return (
    <Screen refreshing={core.some((query) => query.isFetching && !query.isPending)} onRefresh={refetchAll}>
      <LargeTitle
        meta={`${count(totals.properties, "property", "properties")} · ${count(totals.organizations, "organization", "organizations")}`}
        action={<TextLink label="Oversight" onPress={() => router.push("/(admin)/oversight" as Href)} />}
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

      {properties.length ? (
        <View style={styles.section}>
          <SectionTitle meta={attention.billing.length + attention.stale.length ? String(attention.billing.length + attention.stale.length) : "All clear"}>Needs attention</SectionTitle>
          <AttentionGroups attention={attention} onOpenOrganization={openOrganization} />
          <View style={styles.group}>
            <View>
              <Text style={styles.groupTitle}>Setup</Text>
              <Text style={styles.groupHint}>Hotels still missing rooms, rates, an address or a cover photo.</Text>
            </View>
            {setup.length ? (
              <Panel>
                {setup.slice(0, MAX_ATTENTION_ROWS).map(({ property, status }) => {
                  const missing = getMissingSetup(property);
                  const organization = property.organization.name;
                  return (
                    <ListRow
                      key={property.id}
                      title={property.name}
                      detail={missing.length ? `${organization} · missing ${missing.join(", ")}` : `${organization} · switched off`}
                      trailing={<StatusPill tone={status.tone}>{status.label}</StatusPill>}
                      chevron
                      onPress={() => openOrganization(property.organization.slug)}
                    />
                  );
                })}
              </Panel>
            ) : (
              <Text style={styles.groupEmpty}>All hotels are live.</Text>
            )}
          </View>
        </View>
      ) : null}

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

const styles = StyleSheet.create({
  kpis: { marginTop: space.xl, gap: space.md },
  section: { marginTop: space.xxxl, gap: space.lg },
  group: { gap: space.md },
  groupTitle: { ...type.rowTitle, color: colors.foreground },
  groupHint: { ...type.caption, color: colors.subtleForeground, marginTop: 2 },
  groupEmpty: { ...type.meta, color: colors.mutedForeground },
  count: { ...type.body, color: colors.foreground, fontVariant: ["tabular-nums"] },
});
