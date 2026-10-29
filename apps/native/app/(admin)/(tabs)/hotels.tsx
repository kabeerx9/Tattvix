// Hotels: every property on the platform, searchable and sortable, then the
// organizations (including ones with no properties yet). Rows open the
// organization; "Add hotel" pushes onboarding.
import { PORTFOLIO_SORTS, filterAndSortPortfolio, getPortfolioTotals, type PortfolioSort } from "@tattvix/api";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { Hotel, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { PropertyRow, count, organizationHref } from "@/src/components/admin-portfolio";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { EmptyState, InitialsAvatar, LargeTitle, ListRow, Panel, PillTabs, Screen, SectionTitle, StatusPill, TextField, TextLink, space } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import { initialsOf } from "@/src/lib/format";

export default function HotelsScreen() {
  const router = useRouter();
  const portfolio = useQuery(queries.platformPortfolioContacts.list());
  const organizations = useQuery(queries.platformOrganizations.list());
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<PortfolioSort>("name");

  const core = [portfolio, organizations];
  const refetchAll = () => core.forEach((query) => void query.refetch());
  const properties = portfolio.data?.properties ?? [];
  const rows = useMemo(() => filterAndSortPortfolio(properties, { search, sort }), [properties, search, sort]);

  if (!portfolio.data || !organizations.data) {
    if (core.some((query) => query.isError)) return <RetryScreen onRetry={refetchAll} retrying={core.some((query) => query.isFetching)} />;
    return <PendingScreen />;
  }

  const totals = getPortfolioTotals(properties);
  const openOnboard = () => router.push("/(admin)/onboard" as Href);
  const openOrganization = (slug: string) => router.push(organizationHref(slug));

  return (
    <Screen refreshing={core.some((query) => query.isFetching && !query.isPending)} onRefresh={refetchAll}>
      <LargeTitle
        meta={`${count(totals.properties, "property", "properties")} · ${count(totals.organizations, "organization", "organizations")}`}
        action={<TextLink label="Add hotel" onPress={openOnboard} />}
      >
        Hotels
      </LargeTitle>

      {properties.length ? (
        <>
          <View style={styles.search}>
            <TextField
              value={search}
              onChangeText={setSearch}
              placeholder="Hotel, owner, email or phone"
              accessibilityLabel="Search hotels by name, organization, address, owner, email or phone"
              autoCapitalize="none"
              autoCorrect={false}
              enter="done"
            />
          </View>
          <PillTabs items={PORTFOLIO_SORTS.map((option) => ({ key: option.value, label: option.label }))} value={sort} onChange={(key) => setSort(key as PortfolioSort)} />
          <View style={styles.section}>
            <SectionTitle meta={rows.length === properties.length ? count(rows.length, "property", "properties") : `${rows.length} of ${properties.length}`}>Properties</SectionTitle>
            {rows.length ? (
              <Panel>
                {rows.map((property) => (
                  <PropertyRow key={property.id} property={property} onPress={() => openOrganization(property.organization.slug)} />
                ))}
              </Panel>
            ) : (
              <EmptyState icon={Search} text="No hotels match. Try a hotel, owner, email, phone or city." action={{ label: "Clear search", onPress: () => setSearch("") }} />
            )}
          </View>
        </>
      ) : (
        <View style={styles.section}>
          <EmptyState icon={Hotel} text="No hotels onboarded yet. Onboard the first organization, property and owner, or approve a hotel request." action={{ label: "Onboard a hotel", onPress: openOnboard, variant: "primary" }} />
        </View>
      )}

      {organizations.data.organizations.length ? (
        <View style={styles.section}>
          <SectionTitle meta={count(organizations.data.organizations.length, "organization", "organizations")}>Organizations</SectionTitle>
          <Panel>
            {organizations.data.organizations.map((organization) => (
              <ListRow
                key={organization.id}
                leading={<InitialsAvatar initials={initialsOf(organization.name)} name={organization.slug} size={40} />}
                title={organization.name}
                detail={`${organization.slug} · ${count(organization.propertyCount, "property", "properties")} · ${organization.memberCount} members`}
                trailing={<StatusPill tone={organization.isActive ? "success" : "neutral"}>{organization.isActive ? "Active" : "Inactive"}</StatusPill>}
                chevron
                onPress={() => openOrganization(organization.slug)}
              />
            ))}
          </Panel>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { marginTop: space.xl },
  section: { marginTop: space.xxxl, gap: space.md },
});
