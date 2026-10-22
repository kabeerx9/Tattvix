import type { PlatformPortfolioProperty } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tattvix/ui/components/select";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  BedDouble,
  CalendarCheck,
  ClipboardList,
  Hotel,
  IndianRupee,
  Plus,
  Search,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import {
  EmptyState,
  FilterBar,
  Kpi,
  KpiStrip,
  ListRow,
  PageHeader,
  Panel,
  PanelHeader,
  PanelSection,
  PhotoTile,
  ResponsiveTable,
} from "@/components/design-system";
import { OrganizationsPanel } from "@/features/platform-organizations/components/organizations-panel";
import { platformOrganizationQueries } from "@/features/platform-organizations/queries";
import { formatMoneyWholeRupees } from "@/lib/money";

import {
  PORTFOLIO_SORTS,
  filterAndSortPortfolio,
  formatLastActivity,
  formatPercent,
  formatRateRange,
  getOccupancyRecent,
  getOccupancyTonight,
  getPortfolioTotals,
  type PortfolioSort,
} from "../metrics";
import { platformPortfolioQueries } from "../queries";
import { SetupPill, roomStatusSummary } from "./portfolio-parts";

export function PortfolioOverviewPage() {
  const { data: portfolio } = useSuspenseQuery(platformPortfolioQueries.list());
  const { data: organizations } = useSuspenseQuery(platformOrganizationQueries.list());
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<PortfolioSort>("name");
  const deferredSearch = useDeferredValue(search);

  const totals = useMemo(() => getPortfolioTotals(portfolio.properties), [portfolio.properties]);
  const rows = useMemo(
    () => filterAndSortPortfolio(portfolio.properties, { search: deferredSearch, sort }),
    [portfolio.properties, deferredSearch, sort],
  );

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6">
      <PageHeader
        title="Hotels"
        meta={`${totals.properties} ${totals.properties === 1 ? "property" : "properties"} · ${totals.organizations} ${totals.organizations === 1 ? "organization" : "organizations"}`}
        actions={
          <>
            <Button variant="outline" nativeButton={false} render={<Link to="/admin/oversight" />}>
              <ShieldAlert />
              Oversight
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link to="/admin/requests" />}>
              <ClipboardList />
              Review requests
            </Button>
            <Button nativeButton={false} render={<Link to="/admin/onboard" />}>
              <Plus />
              Onboard a hotel
            </Button>
          </>
        }
      />

      <KpiStrip>
        <Kpi icon={Hotel} label="Properties" value={totals.properties} detail={`${totals.organizations} ${totals.organizations === 1 ? "organization" : "organizations"}`} />
        <Kpi icon={BedDouble} label="Rooms" value={totals.rooms} detail={`${totals.readyRooms} ready tonight`} />
        <Kpi icon={BedDouble} label="Occupancy tonight" value={formatPercent(totals.occupancyTonight)} detail={`${totals.occupiedRooms} of ${totals.rooms} rooms · ${formatPercent(totals.occupancyRecent)} last 7 nights`} />
        <Kpi icon={UsersRound} label="In house" value={totals.inHouse} detail={`${totals.arrivalsPending} waiting to check in`} />
        <Kpi icon={CalendarCheck} label="Check-ins" value={totals.checkInsLast7Days} detail="Last 7 days" />
        <Kpi icon={IndianRupee} label="Revenue" value={formatMoneyWholeRupees(totals.revenueLast30DaysMinor)} detail="Billed, last 30 days" />
      </KpiStrip>

      {portfolio.properties.length ? (
        <Panel>
          <PanelHeader title="Properties" icon={Hotel} meta={rows.length === portfolio.properties.length ? rows.length : `${rows.length} of ${portfolio.properties.length}`} />
          <PanelSection>
            <FilterBar className="sm:items-center">
              <div className="relative sm:w-[280px]">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Jaipur, Tattwix Hotels"
                  aria-label="Search hotels by name, organization or address"
                  className="pl-9"
                />
              </div>
              <Select
                items={PORTFOLIO_SORTS.map((option) => ({ value: option.value, label: `Sort: ${option.label}` }))}
                value={sort}
                onValueChange={(value) => value && setSort(value as PortfolioSort)}
              >
                <SelectTrigger className="w-full sm:w-[220px]" aria-label="Sort properties">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PORTFOLIO_SORTS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {`Sort: ${option.label}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterBar>
          </PanelSection>
          {rows.length ? (
            <PortfolioTable rows={rows} />
          ) : (
            <EmptyState
              icon={Search}
              title="No hotels match"
              description="Try a property, organization or city name."
              action={<Button variant="outline" onClick={() => setSearch("")}>Clear search</Button>}
            />
          )}
        </Panel>
      ) : (
        <Panel>
          <EmptyState
            icon={Hotel}
            title="No hotels onboarded yet"
            description="Onboard the first organization, property and owner, or approve a hotel request."
            action={
              <Button nativeButton={false} render={<Link to="/admin/onboard" />}>
                <Plus />
                Onboard a hotel
              </Button>
            }
          />
        </Panel>
      )}

      <OrganizationsPanel organizations={organizations.organizations} />
    </div>
  );
}

function PropertyThumb({ property }: { property: PlatformPortfolioProperty }) {
  return <PhotoTile url={property.coverPhotoUrl} icon={Hotel} className="size-11 shrink-0 rounded-xl" iconClassName="size-5" />;
}

function PortfolioTable({ rows }: { rows: PlatformPortfolioProperty[] }) {
  return (
    <ResponsiveTable
      label="Properties"
      rows={rows}
      getRowKey={(property) => property.id}
      switchAt="5xl"
      rowClassName="min-h-[64px]"
      rowLink={(property, props) => (
        <Link {...props} to="/admin/$organizationSlug" params={{ organizationSlug: property.organization.slug }} />
      )}
      columns={[
        {
          header: "Property",
          width: "minmax(0,2.2fr)",
          className: "flex items-center gap-3",
          cell: (property) => (
            <>
              <PropertyThumb property={property} />
              <span className="min-w-0">
                <span className="block truncate font-medium">{property.name}</span>
                <span className="block truncate text-xs text-subtle-foreground">
                  {property.organization.name}
                  {property.address ? ` · ${property.address}` : ""}
                </span>
              </span>
            </>
          ),
        },
        {
          header: "Rooms",
          width: "minmax(0,1.2fr)",
          cell: (property) => (
            <span className="min-w-0">
              <span className="block font-medium tabular-nums">{property.rooms.total}</span>
              <span className="block truncate text-xs text-subtle-foreground tabular-nums">{roomStatusSummary(property.rooms)}</span>
            </span>
          ),
        },
        {
          header: "Nightly rate",
          width: "minmax(0,1fr)",
          className: "tabular-nums",
          cell: (property) => (
            <span className="min-w-0">
              <span className="block truncate">{formatRateRange(property.rates)}</span>
              {property.rates.avgMinor !== null ? (
                <span className="block text-xs text-subtle-foreground">avg {formatMoneyWholeRupees(property.rates.avgMinor)}</span>
              ) : null}
            </span>
          ),
        },
        {
          header: "Tonight",
          width: "90px",
          align: "end",
          className: "tabular-nums",
          cell: (property) => (
            <span>
              <span className="block font-medium">{formatPercent(getOccupancyTonight(property))}</span>
              <span className="block text-xs text-subtle-foreground">{formatPercent(getOccupancyRecent(property))} 7n</span>
            </span>
          ),
        },
        {
          header: "In house",
          width: "80px",
          align: "end",
          className: "tabular-nums",
          cell: (property) => (
            <span>
              <span className="block font-medium">{property.stays.inHouse}</span>
              <span className="block text-xs text-subtle-foreground">{property.stays.checkInsLast7Days} in 7d</span>
            </span>
          ),
        },
        {
          header: "Revenue 30d",
          width: "110px",
          align: "end",
          className: "tabular-nums",
          cell: (property) => formatMoneyWholeRupees(property.revenueLast30DaysMinor),
        },
        {
          header: "Status",
          width: "130px",
          cell: (property) => (
            <span className="grid justify-items-start gap-1">
              <SetupPill property={property} />
              <span className="text-xs text-subtle-foreground">{formatLastActivity(property.lastActivityAt)}</span>
            </span>
          ),
        },
      ]}
      mobileRow={(property) => (
        <ListRow
          leading={<PropertyThumb property={property} />}
          title={property.name}
          badge={<SetupPill property={property} />}
          meta={
            <>
              <span className="line-clamp-2">{property.organization.name}{property.address ? ` · ${property.address}` : ""}</span>
              <span className="block">
                {property.rooms.total} rooms · {formatRateRange(property.rates)} · {property.stays.inHouse} in house
              </span>
            </>
          }
          trailing={
            <span className="grid justify-items-end">
              <span className="font-semibold">{formatPercent(getOccupancyTonight(property))}</span>
              <span className="text-xs text-subtle-foreground">tonight</span>
            </span>
          }
        />
      )}
    />
  );
}
