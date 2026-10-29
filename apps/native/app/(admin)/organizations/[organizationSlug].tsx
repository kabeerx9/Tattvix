// One organization for the platform admin: totals, the subscription (extend
// trial), its properties (add one, room types) and its members (add, change
// role, deactivate). Pushed from the overview, Hotels and Requests.
import { formatMoneyWholeRupees, formatPercent, getPortfolioTotals } from "@tattvix/api";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { MembersSection, PropertiesSection, SubscriptionSection } from "@/src/components/admin-organization";
import { count } from "@/src/components/admin-portfolio";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { Kpi, KpiRow, LargeTitle, Screen, SecondaryHeader, space } from "@/src/design-system";
import { queries } from "@/src/lib/api";

export default function OrganizationScreen() {
  const router = useRouter();
  const { organizationSlug } = useLocalSearchParams<{ organizationSlug: string }>();
  const detail = useQuery(queries.platformOrganizations.detail(organizationSlug));
  const portfolio = useQuery(queries.platformPortfolioContacts.list(organizationSlug));

  const core = [detail, portfolio];
  const refetchAll = () => core.forEach((query) => void query.refetch());

  if (!detail.data || !portfolio.data) {
    const failed = core.find((query) => query.isError);
    if (failed) return <RetryScreen onRetry={refetchAll} retrying={core.some((query) => query.isFetching)} error={failed.error} />;
    return <PendingScreen />;
  }

  const { organization, members, subscription, pricing } = detail.data;
  const properties = portfolio.data.properties;
  const totals = getPortfolioTotals(properties);

  return (
    <Screen refreshing={core.some((query) => query.isFetching && !query.isPending)} onRefresh={refetchAll}>
      <SecondaryHeader title={organization.name} onBack={() => router.back()} />
      <LargeTitle meta={`${organization.slug} · ${organization.isActive ? "Active" : "Inactive"}`}>{organization.name}</LargeTitle>

      <View style={styles.kpis}>
        <KpiRow>
          <Kpi label="Properties" value={detail.data.properties.length} />
          <Kpi label="Rooms" value={`${totals.rooms} · ${totals.readyRooms} ready`} />
        </KpiRow>
        <KpiRow>
          <Kpi label="Occupancy tonight" value={formatPercent(totals.occupancyTonight)} />
          <Kpi label="In house" value={totals.inHouse} />
        </KpiRow>
        <KpiRow>
          <Kpi label="Revenue · 30 days" value={formatMoneyWholeRupees(totals.revenueLast30DaysMinor)} />
          <Kpi label="Members" value={count(members.length, "member", "members")} />
        </KpiRow>
      </View>

      <SubscriptionSection organizationSlug={organizationSlug} subscription={subscription} pricing={pricing} />
      <PropertiesSection organizationSlug={organizationSlug} properties={properties} />
      <MembersSection organizationSlug={organizationSlug} members={members} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kpis: { marginTop: space.xl, gap: space.md },
});
