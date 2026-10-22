// Variant 3 — "Insights": Airbnb host Insights/Earnings flavour. Property
// cover hero, "needs you now" action-card rail, KPI rail, one trend chart
// with a range switch, and today's movement lists. Drill-in via sheets.
import type { HotelStayListItem } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@tattvix/ui/components/chart";
import { cn } from "@tattvix/ui/lib/utils";
import { ArrowRight, BrushCleaning, Clock, LogOut } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { countArrivalsToday, countDeparturesToday, getOccupancyTrend } from "@/features/hotel-overview/metrics";
import { formatMoneyWholeRupees } from "@/lib/money";

import { BottomSheet } from "./bottom-sheet";
import { Avatar, Frame, LargeTitle, SectionTitle, TextAction } from "./chrome";
import { createSummary, photos, property } from "./data";
import { formatDayInline, formatTime, partyLabel, StaySheet, stayStatusLine } from "./sheets";
import { useMockHotel, type MockHotelState } from "./use-mock-hotel";

type Range = 7 | 14 | 30;
type Metric = "occupancy" | "revenue";
type Queue = "waiting" | "leaving" | "cleaning" | null;

const chartConfig = {
  value: { label: "Occupancy", color: "var(--chart-1)" },
} satisfies ChartConfig;

const shortDay = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

export function InsightsVariant() {
  const hotel = useMockHotel();
  const [range, setRange] = useState<Range>(7);
  const [metric, setMetric] = useState<Metric>("occupancy");
  const [queue, setQueue] = useState<Queue>(null);
  const [stayId, setStayId] = useState<string | null>(null);
  const now = new Date();

  const summary = useMemo(
    () => createSummary(range, hotel.stats.active, hotel.stats.occupied),
    [range, hotel.stats.active, hotel.stats.occupied],
  );
  const trend = getOccupancyTrend(summary);
  const chartData = trend.map((entry, index) => ({
    label: range === 7 ? entry.label : shortDay.format(new Date(`${entry.date}T12:00:00`)),
    value: metric === "occupancy" ? entry.percent : Math.round(summary.revenue!.byDay[index]!.amountMinor / 100),
  }));
  const average = Math.round(trend.reduce((sum, entry) => sum + entry.percent, 0) / trend.length);
  const departures = countDeparturesToday(hotel.stays, now);

  const actionCards = [
    {
      key: "waiting" as const,
      icon: Clock,
      count: hotel.waiting.length,
      title: "waiting for a room",
      detail: hotel.waiting.length ? `Longest since ${formatTime(hotel.waiting[0]!.submittedAt)}` : "Everyone has a room",
      cta: "Assign rooms",
    },
    {
      key: "leaving" as const,
      icon: LogOut,
      count: hotel.leaving.length,
      title: "checking out today",
      detail: hotel.leaving.some((stay) => stay.expectedCheckOutDate! < hotel.todayKey) ? "1 overdue from yesterday" : "Checkout by 11:00",
      cta: "Review checkouts",
    },
    {
      key: "cleaning" as const,
      icon: BrushCleaning,
      count: hotel.toClean.length,
      title: "rooms to clean",
      detail: `${hotel.vacantRooms.length} already ready`,
      cta: "Open housekeeping",
    },
  ];

  const kpis = [
    { label: "Occupancy tonight", value: `${hotel.stats.occupancyPercent}%`, detail: `${hotel.stats.occupied} of ${hotel.stats.active} rooms` },
    { label: "In house", value: hotel.inHouse.length, detail: `${hotel.inHouse.reduce((sum, stay) => sum + stay.companionCount + 1, 0)} guests` },
    { label: "Arrivals today", value: countArrivalsToday(hotel.stays, now), detail: `${hotel.waiting.length} still waiting` },
    { label: "Departures today", value: departures.done + departures.due, detail: `${departures.done} done · ${departures.due} due` },
    { label: `Revenue, ${range} days`, value: formatMoneyWholeRupees(summary.revenue!.totalMinor), detail: "Posted charges" },
  ];

  return (
    <Frame>
      <LargeTitle title="Today" meta={new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(now)} />

      <div className="relative mt-6 overflow-hidden rounded-3xl bg-muted md:mt-8">
        {photos.cover ? (
          <img src={photos.cover.url} alt="" className="aspect-[4/3] w-full object-cover sm:aspect-[21/9] lg:aspect-[3/1]" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 text-white md:p-8">
          <div className="min-w-0">
            <p className="text-2xl font-bold tracking-tight md:text-[32px]">{property.name}</p>
            <p className="text-sm text-white/85 md:text-base">{property.city}</p>
          </div>
          <div className="rounded-2xl bg-white/95 px-4 py-2.5 text-foreground shadow-sm">
            <p className="text-xs text-muted-foreground">Tonight</p>
            <p className="text-lg leading-tight font-bold tabular-nums">
              {hotel.stats.occupancyPercent}% <span className="text-sm font-medium text-muted-foreground">occupied</span>
            </p>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <SectionTitle title="Needs you now" className="mb-4" />
        <div className="pd-rail auto-cols-[78%] sm:auto-cols-[44%] md:auto-cols-fr md:grid-flow-row md:grid-cols-3 md:overflow-visible">
          {actionCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setQueue(card.key)}
                className="pd-press pd-enter flex flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-[var(--pd-shadow-card)] hover:shadow-[var(--pd-shadow-raised)]"
                style={{ "--i": index } as React.CSSProperties}
              >
                <span className="grid size-10 place-items-center rounded-xl bg-primary-tint text-primary">
                  <Icon className="size-5" />
                </span>
                <p className="mt-4 text-[17px] leading-snug font-semibold">
                  <span className="tabular-nums">{card.count}</span> {card.title}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{card.detail}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4">
                  {card.cta} <ArrowRight className="size-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <div className="pd-rail auto-cols-[44%] sm:auto-cols-[30%] md:auto-cols-[28%] lg:auto-cols-fr lg:grid-flow-row lg:grid-cols-5 lg:overflow-visible">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="min-w-0 rounded-2xl border border-border p-4 md:p-5">
              <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground md:line-clamp-1 md:min-h-0">{kpi.label}</p>
              <p className="mt-1.5 truncate text-[26px] leading-tight font-bold tracking-tight tabular-nums">{kpi.value}</p>
              <p className="mt-0.5 truncate text-xs text-subtle-foreground">{kpi.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-border p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{metric === "occupancy" ? "Occupancy" : "Revenue"}</h2>
            <p className="text-sm text-muted-foreground tabular-nums">
              {metric === "occupancy"
                ? `${average}% average over ${range} days`
                : `${formatMoneyWholeRupees(summary.revenue!.totalMinor)} over ${range} days`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Segmented
              label="Metric"
              value={metric}
              onChange={setMetric}
              items={[
                { value: "occupancy", label: "Occupancy" },
                { value: "revenue", label: "Revenue" },
              ]}
            />
            <Segmented
              label="Range"
              value={range}
              onChange={setRange}
              items={[
                { value: 7, label: "7D" },
                { value: 14, label: "14D" },
                { value: 30, label: "30D" },
              ]}
            />
          </div>
        </div>
        <ChartContainer config={chartConfig} className="mt-5 h-56 w-full md:h-64">
          <AreaChart data={chartData} margin={{ left: 0, right: 4, top: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--border-soft)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
            <YAxis
              width={metric === "occupancy" ? 40 : 56}
              tickLine={false}
              axisLine={false}
              domain={metric === "occupancy" ? [0, 100] : [0, "auto"]}
              tickFormatter={(value: number) => (metric === "occupancy" ? `${value}%` : `₹${Math.round(value / 1000)}k`)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    metric === "occupancy" ? `${value}% occupied` : formatMoneyWholeRupees(Number(value) * 100)
                  }
                />
              }
            />
            <Area
              dataKey="value"
              type="monotone"
              stroke="var(--color-value)"
              strokeWidth={2.25}
              fill="var(--color-value)"
              fillOpacity={0.1}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </section>

      <section className="mt-10 grid gap-8 md:grid-cols-2 md:gap-6">
        <PeopleList
          title="Arriving"
          meta="Guests who checked in on their phone"
          stays={hotel.waiting}
          hotel={hotel}
          onOpen={setStayId}
          empty="No one is waiting."
          onSeeAll={() => setQueue("waiting")}
        />
        <PeopleList
          title="Checking out"
          meta="Due by 11:00 today"
          stays={hotel.leaving}
          hotel={hotel}
          onOpen={setStayId}
          empty="No departures due."
          onSeeAll={() => setQueue("leaving")}
        />
      </section>

      <QueueSheet hotel={hotel} queue={queue} onClose={() => setQueue(null)} onOpenStay={(id) => { setQueue(null); setStayId(id); }} />
      <StaySheet hotel={hotel} stayId={stayId} onClose={() => setStayId(null)} />
    </Frame>
  );
}

function Segmented<T extends string | number>({
  value,
  onChange,
  items,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-muted p-1">
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={String(item.value)}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(item.value)}
            className={cn(
              "pd-press h-8 rounded-full px-3.5 text-sm",
              isActive ? "bg-background font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function PeopleList({
  title,
  meta,
  stays,
  hotel,
  onOpen,
  empty,
  onSeeAll,
}: {
  title: string;
  meta: string;
  stays: HotelStayListItem[];
  hotel: MockHotelState;
  onOpen: (id: string) => void;
  empty: string;
  onSeeAll: () => void;
}) {
  return (
    <div>
      <SectionTitle title={title} meta={meta} action={stays.length > 3 ? <TextAction onClick={onSeeAll}>Show all</TextAction> : null} className="mb-2" />
      <ul className="divide-y divide-border-soft">
        {stays.slice(0, 3).map((stay) => {
          const status = stayStatusLine(stay, hotel.todayKey);
          return (
            <li key={stay.id}>
              <button type="button" onClick={() => onOpen(stay.id)} className="pd-press flex min-h-[72px] w-full items-center gap-3 py-2 text-left">
                <Avatar name={stay.guestName} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{stay.guestName}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {stay.room ? `Room ${stay.room.number} · ` : ""}
                    {partyLabel(stay)}
                  </span>
                </span>
                <span className={cn("shrink-0 text-sm font-medium", status.className)}>
                  {stay.operationalStatus === "PENDING_CHECK_IN" ? formatTime(stay.submittedAt) : status.text.replace("Checking out today", "Today")}
                </span>
              </button>
            </li>
          );
        })}
        {!stays.length ? <li className="py-6 text-sm text-muted-foreground">{empty}</li> : null}
      </ul>
    </div>
  );
}

function QueueSheet({
  hotel,
  queue,
  onClose,
  onOpenStay,
}: {
  hotel: MockHotelState;
  queue: Queue;
  onClose: () => void;
  onOpenStay: (id: string) => void;
}) {
  const [last, setLast] = useState<Queue>(queue);
  if (queue && queue !== last) setLast(queue);
  const current = queue ?? last;
  const titles = { waiting: "Waiting for a room", leaving: "Checking out today", cleaning: "Housekeeping" } as const;

  return (
    <BottomSheet open={queue !== null} onClose={onClose} title={current ? titles[current] : ""}>
      <ul className="-my-2 divide-y divide-border-soft">
        {current === "cleaning"
          ? hotel.toClean.map((room) => (
              <li key={room.id} className="flex min-h-16 items-center gap-3 py-2">
                <span className="grid size-11 place-items-center rounded-xl bg-warning-tint text-sm font-semibold text-warning tabular-nums">
                  {room.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{room.roomType}</span>
                  <span className="block text-sm text-muted-foreground">{room.floor} floor</span>
                </span>
                <Button variant="outline" className="pd-press h-9 rounded-full px-4 text-sm" onClick={() => hotel.setRoomStatus(room.id, "VACANT")}>
                  Mark ready
                </Button>
              </li>
            ))
          : (current === "waiting" ? hotel.waiting : hotel.leaving).map((stay) => (
              <li key={stay.id} className="flex min-h-16 items-center gap-3 py-2">
                <button type="button" onClick={() => onOpenStay(stay.id)} className="pd-press flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Avatar name={stay.guestName} />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{stay.guestName}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {stay.room ? `Room ${stay.room.number} · ` : ""}
                      {current === "waiting" ? `since ${formatTime(stay.submittedAt)}` : `due out ${formatDayInline(stay.expectedCheckOutDate, hotel.todayKey)}`}
                    </span>
                  </span>
                </button>
                {current === "waiting" ? (
                  <Button className="pd-press h-9 rounded-full px-4 text-sm" onClick={() => onOpenStay(stay.id)}>
                    Assign
                  </Button>
                ) : (
                  <Button variant="outline" className="pd-press h-9 rounded-full px-4 text-sm" onClick={() => hotel.checkOut(stay.id)}>
                    Check out
                  </Button>
                )}
              </li>
            ))}
        {current &&
        !(current === "cleaning" ? hotel.toClean.length : current === "waiting" ? hotel.waiting.length : hotel.leaving.length) ? (
          <li className="py-8 text-center text-sm text-muted-foreground">All done here.</li>
        ) : null}
      </ul>
    </BottomSheet>
  );
}
