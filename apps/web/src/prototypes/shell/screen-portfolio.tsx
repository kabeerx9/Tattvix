// The platform admin "Hotels" portfolio, rendered three ways. Data and the
// metrics are the production helpers; the room types sheet is a neutral copy;
// only the layout changes per direction.
import type { PlatformPortfolioProperty } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { PillTabs } from "@tattvix/ui/components/pill-tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@tattvix/ui/components/select";
import { cn } from "@tattvix/ui/lib/utils";
import {
  ChevronRight,
  ClipboardList,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import {
  ListRow,
  PageHeader,
  Panel,
  PanelHeader,
  PanelSection,
  ResponsiveTable,
  SectionTitle,
} from "@/components/design-system";
import {
  RoomStatusBar,
  SetupPill,
  roomStatusSummary,
} from "@/features/platform-portfolio/components/portfolio-parts";
import {
  PORTFOLIO_SORTS,
  filterAndSortPortfolio,
  formatLastActivity,
  formatPercent,
  formatRateRange,
  getMissingSetup,
  getOccupancyRecent,
  getOccupancyTonight,
  getPortfolioTotals,
  getSetupStatus,
  type PortfolioSort,
} from "@/features/platform-portfolio/metrics";
import { formatMoneyWholeRupees } from "@/lib/money";

import { notBuilt, Photo, StatStrip, useLastDefined } from "./common";
import { RoomTypesSheet } from "./room-types-sheet";
import { portfolio, portfolioTrend } from "./data";

export type PortfolioLayout = "gallery" | "table" | "split";

const crore = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
/** KPI-sized money: "₹1.52 Cr" / "₹8.1 L"; the exact figure goes in the detail line. */
function formatCrore(minor: number) {
  const rupees = minor / 100;
  if (rupees >= 1e7) return `₹${crore.format(rupees / 1e7)} Cr`;
  if (rupees >= 1e5) return `₹${crore.format(rupees / 1e5)} L`;
  return formatMoneyWholeRupees(minor);
}

type StatusFilter = "all" | "live" | "setup";

function usePortfolio() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<PortfolioSort>("occupancy");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sheetId, setSheetId] = useState<number | null>(null);
  const deferred = useDeferredValue(search);
  const totals = useMemo(() => getPortfolioTotals(portfolio), []);
  const sorted = useMemo(() => filterAndSortPortfolio(portfolio, { search: deferred, sort }), [deferred, sort]);
  const rows = sorted.filter((property) => {
    const tone = getSetupStatus(property).tone;
    return status === "all" || (status === "live" ? tone === "success" : tone === "warning");
  });
  const counts = {
    all: sorted.length,
    live: sorted.filter((property) => getSetupStatus(property).tone === "success").length,
    setup: sorted.filter((property) => getSetupStatus(property).tone === "warning").length,
  };
  return { search, setSearch, sort, setSort, status, setStatus, sheetId, setSheetId, totals, rows, counts };
}

type Model = ReturnType<typeof usePortfolio>;

export function PortfolioScreen({ layout }: { layout: PortfolioLayout }) {
  const model = usePortfolio();
  const sheetProperty = useLastDefined(portfolio.find((property) => property.id === model.sheetId));
  return (
    <>
      {layout === "gallery" ? <Gallery model={model} /> : null}
      {layout === "table" ? <TableLayout model={model} /> : null}
      {layout === "split" ? <SplitLayout model={model} /> : null}
      {sheetProperty ? (
        <RoomTypesSheet property={sheetProperty} open={model.sheetId !== null} onOpenChange={(open) => !open && model.setSheetId(null)} />
      ) : null}
    </>
  );
}

const headerMeta = (model: Model) => `${model.totals.properties} properties · ${model.totals.organizations} organizations`;

function HeaderActions({ compact }: { compact?: boolean }) {
  return (
    <>
      <Button variant="outline" onClick={() => notBuilt("Review requests")} className={cn(compact && "max-sm:hidden")}>
        <ClipboardList />
        Review requests
      </Button>
      <Button onClick={() => notBuilt("Onboard a hotel")}>
        <Plus />
        Onboard a hotel
      </Button>
    </>
  );
}

function Kpis({ model }: { model: Model }) {
  const t = model.totals;
  return (
    <StatStrip
      items={[
        { label: "Properties", value: t.properties, detail: `${t.organizations} organizations` },
        { label: "Rooms", value: t.rooms, detail: `${t.readyRooms} ready tonight` },
        { label: "Occupancy tonight", value: formatPercent(t.occupancyTonight), detail: `${t.occupiedRooms} of ${t.rooms} rooms · ${formatPercent(t.occupancyRecent)} last 7 nights` },
        { label: "In house", value: t.inHouse, detail: `${t.arrivalsPending} waiting to check in` },
        { label: "Check-ins", value: t.checkInsLast7Days, detail: "Last 7 days" },
        { label: "Revenue", value: formatCrore(t.revenueLast30DaysMinor), detail: `${formatMoneyWholeRupees(t.revenueLast30DaysMinor)} billed, last 30 days` },
      ]}
    />
  );
}

function SearchField({ model, className }: { model: Model; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={model.search}
        onChange={(event) => model.setSearch(event.target.value)}
        placeholder="Jaipur, Rajwada Hospitality"
        aria-label="Search hotels by name, organization or address"
        className="h-10 pl-9"
      />
    </div>
  );
}

function SortSelect({ model, className }: { model: Model; className?: string }) {
  const items = PORTFOLIO_SORTS.map((option) => ({ value: option.value, label: `Sort: ${option.label}` }));
  return (
    <Select items={items} value={model.sort} onValueChange={(value) => value && model.setSort(value as PortfolioSort)}>
      <SelectTrigger className={cn("h-10 w-full sm:w-[230px]", className)} aria-label="Sort properties">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StatusTabs({ model }: { model: Model }) {
  return (
    <PillTabs
      label="Setup status"
      value={model.status}
      onValueChange={model.setStatus}
      items={[
        { value: "all", label: "All hotels", count: model.counts.all },
        { value: "live", label: "Live", count: model.counts.live },
        { value: "setup", label: "Needs setup", count: model.counts.setup },
      ]}
    />
  );
}

function NoMatches({ model }: { model: Model }) {
  return (
    <div className="grid place-items-center gap-3 rounded-card border border-dashed border-border px-6 py-12 text-center">
      <div className="max-w-sm">
        <p className="text-base font-semibold">No hotels match</p>
        <p className="mt-1 text-sm text-muted-foreground">Try a property, organization or city name.</p>
      </div>
      <Button variant="outline" onClick={() => { model.setSearch(""); model.setStatus("all"); }}>
        Clear filters
      </Button>
    </div>
  );
}

/** Occupancy, last 7 nights: this week (chart-1) against last week (chart-2). */
export function OccupancyChart({ className, tall }: { className?: string; tall?: boolean }) {
  const max = 100;
  return (
    <div className={cn("grid gap-3", className)}>
      <div className={cn("grid grid-cols-7 items-end gap-2 sm:gap-3", tall ? "h-44" : "h-32")} role="img" aria-label="Occupancy by night, this week against last week">
        {portfolioTrend.map((entry, index) => (
          <div key={entry.label} className="flex h-full items-end justify-center gap-1">
            <span className="w-full max-w-4 rounded-t-[4px] bg-chart-2" style={{ height: `${(entry.lastWeek / max) * 100}%` }} />
            <span
              className={cn("w-full max-w-4 rounded-t-[4px] bg-chart-1", index !== portfolioTrend.length - 1 && "opacity-90")}
              style={{ height: `${(entry.percent / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs text-subtle-foreground sm:gap-3">
        {portfolioTrend.map((entry) => (
          <span key={entry.label}>{entry.label}</span>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-chart-1" />This week</li>
        <li className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-chart-2" />Last week</li>
      </ul>
    </div>
  );
}

// ---------- Gallery (Host): Airbnb-listing photo cards ----------

function Gallery({ model }: { model: Model }) {
  return (
    <div className="mx-auto grid w-full grid-cols-1 max-w-[1400px] gap-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.03em] md:text-[34px]">Hotels</h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">{headerMeta(model)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <HeaderActions compact />
        </div>
      </header>

      <Kpis model={model} />

      <section className="grid grid-cols-1 gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <StatusTabs model={model} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchField model={model} className="sm:w-[280px]" />
            <SortSelect model={model} />
          </div>
        </div>
        {model.rows.length ? (
          <ul className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {model.rows.map((property, index) => (
              <li key={property.id} className="enter-up min-w-0" style={{ "--i": index } as React.CSSProperties}>
                <ListingCard property={property} onOpen={() => model.setSheetId(property.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <NoMatches model={model} />
        )}
      </section>

      <section className="grid grid-cols-1 items-start gap-4 border-t border-border pt-8 lg:grid-cols-[1fr_2fr] lg:gap-12">
        <SectionTitle title="Occupancy, last 7 nights" meta={`${formatPercent(model.totals.occupancyRecent)} across the portfolio · up 6 pts on last week`} />
        <OccupancyChart tall />
      </section>
    </div>
  );
}

function ListingCard({ property, onOpen }: { property: PlatformPortfolioProperty; onOpen: () => void }) {
  const missing = getMissingSetup(property);
  const city = property.address.split(",").slice(-2).join(",").trim();
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!property.roomTypes.length}
      className="press group block w-full rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 disabled:cursor-default"
      aria-label={`${property.name}, room types and prices`}
    >
      <span className="relative block">
        <Photo url={property.coverPhotoUrl} className="aspect-[4/3] w-full rounded-2xl" label="No photo yet" />
        <span className="absolute top-3 left-3 rounded-full bg-card shadow-card">
          <SetupPill property={property} />
        </span>
      </span>
      <span className="mt-3 flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold">{property.name}</span>
          <span className="block truncate text-[15px] text-muted-foreground">{city || "No address yet"}</span>
        </span>
        <span className="shrink-0 text-right text-[15px] tabular-nums">
          <span className="font-semibold">{formatPercent(getOccupancyTonight(property))}</span>
          <span className="block text-xs text-subtle-foreground">tonight</span>
        </span>
      </span>
      <span className="mt-1 block text-[15px] text-muted-foreground tabular-nums">
        {property.rooms.total ? `${property.rooms.total} rooms · ${property.stays.inHouse} in house` : property.organization.name}
      </span>
      <span className="mt-1 block text-[15px] tabular-nums">
        {property.rates.minMinor !== null ? (
          <>
            <span className="font-semibold">{formatRateRange(property.rates)}</span> <span className="text-muted-foreground">night</span>
          </>
        ) : (
          <span className="text-warning">Missing {missing.join(", ")}</span>
        )}
      </span>
    </button>
  );
}

// ---------- Table (Ledger): dense table + side column ----------

function TableLayout({ model }: { model: Model }) {
  const attention = portfolio.filter((property) => getSetupStatus(property).tone === "warning");
  return (
    <div className="mx-auto grid w-full grid-cols-1 max-w-[1400px] gap-6">
      <PageHeader title="Hotels" meta={headerMeta(model)} actions={<HeaderActions compact />} />
      <Kpis model={model} />
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel>
          <PanelHeader title="Properties" meta={model.rows.length === portfolio.length ? model.rows.length : `${model.rows.length} of ${portfolio.length}`} />
          <PanelSection className="grid gap-3">
            <StatusTabs model={model} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchField model={model} className="sm:flex-1 lg:max-w-[320px]" />
              <SortSelect model={model} />
            </div>
          </PanelSection>
          {model.rows.length ? <PortfolioTable rows={model.rows} onOpen={model.setSheetId} /> : <NoMatches model={model} />}
        </Panel>
        <div className="grid content-start gap-6 -order-1 md:grid-cols-2 2xl:order-none 2xl:grid-cols-1">
          <Panel>
            <PanelHeader title="Occupancy, last 7 nights" meta={formatPercent(model.totals.occupancyRecent)} />
            <PanelSection>
              <OccupancyChart />
            </PanelSection>
          </Panel>
          <Panel>
            <PanelHeader title="Needs setup" meta={attention.length} />
            <ul className="divide-y divide-border-soft">
              {attention.map((property) => (
                <li key={property.id} className="px-5 py-3.5">
                  <ListRow
                    leading={<Photo url={property.coverPhotoUrl} className="size-10 shrink-0 rounded-lg" />}
                    title={property.name}
                    meta={`Missing ${getMissingSetup(property).join(", ")}`}
                    trailing={<SetupPill property={property} />}
                  />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PortfolioTable({ rows, onOpen }: { rows: PlatformPortfolioProperty[]; onOpen: (id: number) => void }) {
  return (
    <ResponsiveTable
      label="Properties"
      rows={rows}
      getRowKey={(property) => property.id}
      switchAt="3xl"
      rowClassName="min-h-[68px]"
      rowLink={(property, props) => (
        <button
          type="button"
          {...props}
          className={cn(props.className, "w-full text-left")}
          onClick={() => onOpen(property.id)}
          aria-label={`${property.name}, room types and prices`}
        />
      )}
      columns={[
        {
          header: "Property",
          width: "minmax(0,2.4fr)",
          className: "flex items-center gap-3",
          cell: (property) => (
            <>
              <Photo url={property.coverPhotoUrl} className="h-11 w-14 shrink-0 rounded-lg" />
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium">{property.name}</span>
                <span className="block truncate text-xs text-subtle-foreground">
                  {property.organization.name}
                  {property.address ? ` · ${property.address}` : ""}
                </span>
              </span>
            </>
          ),
        },
        {
          header: "Rooms tonight",
          width: "minmax(0,1.5fr)",
          cell: (property) => (property.rooms.total ? <RoomStatusBar rooms={property.rooms} className="w-full max-w-[220px] [&_ul]:hidden" /> : <span className="text-xs text-subtle-foreground">No rooms yet</span>),
        },
        {
          header: "Nightly rate",
          width: "minmax(0,1fr)",
          className: "tabular-nums",
          cell: (property) => (
            <span className="min-w-0">
              <span className="block truncate">{formatRateRange(property.rates)}</span>
              {property.rates.avgMinor !== null ? <span className="block text-xs text-subtle-foreground">avg {formatMoneyWholeRupees(property.rates.avgMinor)}</span> : null}
            </span>
          ),
        },
        {
          header: "Tonight",
          width: "80px",
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
          header: "Revenue 30d",
          width: "110px",
          align: "end",
          className: "tabular-nums",
          cell: (property) => formatMoneyWholeRupees(property.revenueLast30DaysMinor),
        },
        {
          header: "Status",
          width: "120px",
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
          leading={<Photo url={property.coverPhotoUrl} className="size-12 shrink-0 rounded-lg" />}
          title={property.name}
          badge={<SetupPill property={property} />}
          meta={
            <>
              <span className="line-clamp-1">{property.organization.name}</span>
              <span className="block">{property.rooms.total ? `${roomStatusSummary(property.rooms)}` : "No rooms yet"}</span>
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

// ---------- Split (Concierge): chart hero + photo rows ----------

function SplitLayout({ model }: { model: Model }) {
  const t = model.totals;
  return (
    <div className="mx-auto grid w-full grid-cols-1 max-w-[1320px] gap-8">
      <PageHeader title="Hotels" meta={headerMeta(model)} actions={<HeaderActions compact />} />

      <section className="grid grid-cols-1 overflow-hidden rounded-card border border-border bg-card shadow-card lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="p-5 sm:p-7">
          <p className="text-sm text-muted-foreground">Occupancy, last 7 nights</p>
          <p className="mt-1 flex items-baseline gap-3">
            <span className="text-[44px] leading-none font-bold tracking-[-0.03em] tabular-nums">{formatPercent(t.occupancyRecent)}</span>
            <span className="text-sm font-medium text-success">+6 pts on last week</span>
          </p>
          <OccupancyChart className="mt-6" />
        </div>
        <dl className="grid grid-cols-2 border-t border-border-soft lg:border-t-0 lg:border-l">
          {[
            { label: "Occupancy tonight", value: formatPercent(t.occupancyTonight), detail: `${t.occupiedRooms} of ${t.rooms} rooms` },
            { label: "In house", value: t.inHouse, detail: `${t.arrivalsPending} waiting to check in` },
            { label: "Check-ins", value: t.checkInsLast7Days, detail: "Last 7 days" },
            { label: "Revenue", value: formatCrore(t.revenueLast30DaysMinor), detail: `${formatMoneyWholeRupees(t.revenueLast30DaysMinor)} billed, last 30 days` },
          ].map((fact, index) => (
            <div key={fact.label} className={cn("min-w-0 p-5 sm:p-6", index % 2 === 0 && "border-r border-border-soft", index < 2 && "border-b border-border-soft")}>
              <dt className="text-sm text-muted-foreground">{fact.label}</dt>
              <dd className="mt-2 text-[26px] leading-none font-semibold tracking-[-0.02em] tabular-nums wrap-anywhere">{fact.value}</dd>
              <dd className="mt-2 text-xs text-subtle-foreground">{fact.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid grid-cols-1 gap-4">
        <SectionTitle title="Properties" meta={`${t.rooms} rooms · ${t.readyRooms} ready tonight`} />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <StatusTabs model={model} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchField model={model} className="sm:w-[280px]" />
            <SortSelect model={model} />
          </div>
        </div>
        {model.rows.length ? (
          <ul className="overflow-hidden rounded-card border border-border bg-card shadow-card">
            {model.rows.map((property, index) => (
              <li key={property.id} className="enter-up border-border-soft [&+&]:border-t" style={{ "--i": index } as React.CSSProperties}>
                <PropertyRow property={property} onOpen={() => model.setSheetId(property.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <NoMatches model={model} />
        )}
      </section>
    </div>
  );
}

function PropertyRow({ property, onOpen }: { property: PlatformPortfolioProperty; onOpen: () => void }) {
  const missing = getMissingSetup(property);
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!property.roomTypes.length}
      className="press grid w-full grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-4 p-4 text-left outline-none hover:bg-muted/60 focus-visible:bg-muted disabled:cursor-default sm:grid-cols-[132px_minmax(0,1fr)_auto] sm:p-5 lg:grid-cols-[132px_minmax(0,1.4fr)_minmax(0,1fr)_120px_24px]"
      aria-label={`${property.name}, room types and prices`}
    >
      <Photo url={property.coverPhotoUrl} className="aspect-[4/3] w-full rounded-xl" label="No photo yet" />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base font-semibold wrap-anywhere">{property.name}</span>
          <SetupPill property={property} />
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{property.address || "No address yet"}</span>
        </span>
        <span className="mt-1 block text-sm text-muted-foreground tabular-nums">
          {property.rates.minMinor !== null ? `${formatRateRange(property.rates)} a night` : <span className="text-warning">Missing {missing.join(", ")}</span>}
          <span className="max-lg:hidden"> · {property.organization.name}</span>
        </span>
      </span>
      <span className="hidden min-w-0 lg:block">
        {property.rooms.total ? <RoomStatusBar rooms={property.rooms} /> : <span className="text-sm text-subtle-foreground">No rooms yet</span>}
      </span>
      <span className="text-right tabular-nums">
        <span className="block text-lg font-semibold">{formatPercent(getOccupancyTonight(property))}</span>
        <span className="block text-xs text-subtle-foreground">{property.stays.inHouse} in house</span>
      </span>
      <ChevronRight className="hidden size-4 text-subtle-foreground lg:block" />
    </button>
  );
}
