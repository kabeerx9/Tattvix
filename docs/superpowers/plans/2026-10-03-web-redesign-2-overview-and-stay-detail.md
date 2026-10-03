# Web Redesign — Plan 2: Overview & Stay Detail

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the hotel Overview from three link cards into a real operational dashboard, and rebuild Stay detail into the calm two-column A3.1 layout — using the shared components this plan introduces.

**Architecture:** Four presentational primitives (`KpiStrip`, `Panel`, `FactsRow`, `StatusPill`) are added to `apps/web/src/components/design-system.tsx`. Overview numbers are computed by pure, unit-tested functions in `features/hotel-overview/metrics.ts` from the **stays list** and **rooms list** only — never the report endpoints, because the Reception role lacks `reports:view`. Charts use shadcn `chart` (Recharts), already installed in `@tattvix/ui`. Stay detail is a layout rewrite: data fetching, mutations, print and identity-image access stay exactly as they are.

**Tech Stack:** React 19, TanStack Router + Query, Tailwind v4, shadcn (`base-lyra`), Recharts 3.8 via `@tattvix/ui/components/chart`, `node:test` + `tsx`.

**Spec:** `docs/superpowers/specs/2026-10-03-web-visual-redesign-design.md` (§5, §6, §7, §10, §11 steps 4–5). Contract: `docs/design-system.md`. Visual reference: `docs/design/reference/a3.1-prototype.html` (+ `overview.jpg`, `stay-detail.jpg`).

**Plan 2 of 4.** Plan 1 (theme, PageHeader, shell) is done.

## Already done (do not redo)

- `recharts@3.8.0` added to `packages/ui`; `packages/ui/src/components/chart.tsx` exists (registry `base-lyra`, `cn` import fixed to `@tattvix/ui/lib/utils`). Exports: `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `ChartStyle`, type `ChartConfig`.

## Global Constraints

- Light theme only; no `dark:` variants. Semantic tokens only; no hex or raw palette classes in feature code.
- Teal is rare: `primary` for the one primary button, links, chart series 1; `primary-tint` only for KPI icon tiles; `success`/`success-tint` for success pills. No `bg-accent`/`text-primary` icon tiles.
- No box in a box: sections inside a panel are separated by `border-border-soft` dividers.
- One fact, one place. One primary action per page.
- Numbers use `tabular-nums`. Sentence case. No uppercase eyebrows.
- **Danger domains (identity access, billing, check-in/checkout):** this plan changes layout only. Do not change any `useQuery`/`useQueries`/`useSuspenseQuery` options, any `useMutation` factory, any `.mutate(...)` arguments, the `imageAccess` queries (they are audited server-side — when and how often they run must not change), or `useReactToPrint` config.
- **Never commit.** Leave changes unstaged.
- Commands (no pnpm in sandboxed agents): tests `cd apps/web && node --import tsx --test 'src/**/*.test.ts'`; types `cd apps/web && ./node_modules/.bin/vite build && ./node_modules/.bin/tsc --noEmit`.

## Data decisions (from spec §7, verified in code 2026-10-03)

| Overview widget | Source | Status |
|---|---|---|
| Occupancy %, room status donut, rooms to clean | `hotelOperationsQueries.rooms` (`rooms:view`) | build |
| Waiting for a room, in-house table, arrivals today | `hotelStayQueries.list` (no filter) (`stays:view`) | build |
| Arrivals vs departures, last 7 days | same list, aggregated client-side by local day of `checkedInAt` / `checkedOutAt` | build |
| Revenue, ADR, occupancy trend | no endpoint | **omit** |
| Leaving today | no expected check-out field on any list item | **omit** (backend: add `expectedCheckOutAt` to stay list item) |

**Scale note (accepted for MVP):** the overview loads the full stays list and aggregates in the browser. Fine at pilot scale; at real volume this becomes a server-side summary endpoint.

## Review Focus

1. **Reception role** opens Overview → loads (no 403), because nothing on the page calls `hotelReportsQueries`. Pinned by Task 3 Step 4 grep.
2. **Property with zero active rooms or zero stays** → Overview renders empty states and `0%`, never `NaN%`. Pinned by Task 2 tests `zero active rooms` and `no stays`.
3. **Inactive rooms** are excluded from occupancy and counts. Pinned by Task 2 test `ignores inactive rooms`.
4. **Pending stay when no vacant room has a rate** → Stay detail check-in panel explains why and the confirm button is disabled (existing logic preserved). Task 4 Step 5 visual check.
5. **Stay whose identity snapshot has expired (`snapshot === null`)** → side panel shows the ended state; no crash; Print hidden (existing behaviour). Task 4 Step 5 visual check.

---

## File map

| Layer | File | Responsibility |
|---|---|---|
| UI primitives | `apps/web/src/components/design-system.tsx` | + `KpiStrip`, `Kpi`, `Panel`, `PanelHeader`, `PanelSection`, `FactsRow`, `Fact`, `StatusPill` (Task 1) |
| Logic | `apps/web/src/features/hotel-overview/metrics.ts` (+ `.test.ts`) | pure overview aggregations (Task 2) |
| Feature | `apps/web/src/features/hotel-overview/components/*.tsx` | overview widgets incl. charts (Task 3) |
| Route | `apps/web/src/routes/_auth/_hotel/hotel/$organizationSlug/$propertySlug/dashboard.tsx` | overview page (Task 3) |
| Feature | `apps/web/src/features/hotel-stays/components/hotel-stay-detail-page.tsx` | stay detail layout (Task 4) |
| Feature | `apps/web/src/features/hotel-stays/components/stay-bill-panel.tsx` | bill restyle (Task 4) |

---

### Task 1: Shared primitives

**Files:** Modify `apps/web/src/components/design-system.tsx` (append; do not change existing exports).

**Interfaces — Produces:**
```ts
KpiStrip({ children }: { children: React.ReactNode })
Kpi({ icon, label, value, detail }: { icon: LucideIcon; label: string; value: React.ReactNode; detail?: React.ReactNode })
Panel({ children, className }: { children: React.ReactNode; className?: string })
PanelHeader({ title, icon, meta, actions }: { title: string; icon?: LucideIcon; meta?: React.ReactNode; actions?: React.ReactNode })
PanelSection({ children, className }: { children: React.ReactNode; className?: string })
FactsRow({ children }: { children: React.ReactNode })
Fact({ label, value, detail }: { label: string; value: React.ReactNode; detail?: React.ReactNode })
StatusPill({ tone, children }: { tone: "success" | "warning" | "danger" | "neutral"; children: React.ReactNode })
```

No unit test (presentational). Verified by type-check now and by use in Tasks 3–4.

- [ ] **Step 1: Append to `design-system.tsx`**

```tsx
/** One bordered strip of KPIs separated by vertical dividers (never separate cards). */
export function KpiStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 divide-border overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04)] sm:grid-cols-3 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none lg:divide-x">
      {children}
    </div>
  );
}

export function Kpi({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
          <Icon className="size-4" />
        </span>
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-3 text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums">
        {value}
      </p>
      {detail ? (
        <p className="mt-2 truncate text-xs text-subtle-foreground">{detail}</p>
      ) : null}
    </div>
  );
}

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  icon: Icon,
  meta,
  actions,
}: {
  title: string;
  icon?: LucideIcon;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-3 border-b border-border-soft px-5 py-3">
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" /> : null}
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        {meta ? <span className="text-sm text-subtle-foreground tabular-nums">{meta}</span> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** A section inside a Panel. Consecutive sections are divided by a soft hairline. */
export function PanelSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-border-soft px-5 py-5 [&+&]:border-t", className)}>
      {children}
    </div>
  );
}

/** Plain inline facts (label over value). No borders or cells. */
export function FactsRow({ children }: { children: React.ReactNode }) {
  return <dl className="flex flex-wrap gap-x-10 gap-y-4">{children}</dl>;
}

export function Fact({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-subtle-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium tabular-nums">
        {value}
        {detail ? (
          <span className="ml-1.5 font-normal text-subtle-foreground">{detail}</span>
        ) : null}
      </dd>
    </div>
  );
}

const statusPillTones = {
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  danger: "bg-destructive-tint text-destructive",
  neutral: "bg-muted text-muted-foreground",
} as const;

export function StatusPill({
  tone,
  children,
}: {
  tone: keyof typeof statusPillTones;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        statusPillTones[tone],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Verify** — types command exits 0.
- [ ] **Step 3: Stop — leave unstaged.**

---

### Task 2: Overview metrics (pure, test-first)

**Files:** Create `apps/web/src/features/hotel-overview/metrics.ts`, `apps/web/src/features/hotel-overview/metrics.test.ts`.

**Interfaces — Produces:**
```ts
import type { HotelRoom, HotelStayListItem } from "@tattvix/contracts";

export type RoomStats = { active: number; occupied: number; vacant: number; cleaning: number; maintenance: number; occupancyPercent: number };
export function getRoomStats(rooms: HotelRoom[]): RoomStats;

export type DayMovement = { day: string; label: string; arrivals: number; departures: number };
export function getDailyMovement(stays: HotelStayListItem[], today: Date, days?: number): DayMovement[];

export function localDayKey(value: Date): string; // "YYYY-MM-DD" in the browser's local time zone

export type NeedsAction = { waiting: HotelStayListItem[]; toClean: HotelRoom[] };
export function getNeedsAction(stays: HotelStayListItem[], rooms: HotelRoom[]): NeedsAction;

export function getInHouse(stays: HotelStayListItem[]): HotelStayListItem[];
export function countArrivalsToday(stays: HotelStayListItem[], today: Date): number;
```

Check `HotelRoom` and `HotelStayListItem` are exported from `@tattvix/contracts` (`packages/contracts/src/index.ts`); both are used today by web code.

- [ ] **Step 1: Write the failing tests** — `metrics.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { HotelRoom, HotelStayListItem } from "@tattvix/contracts";

import {
  countArrivalsToday,
  getDailyMovement,
  getInHouse,
  getNeedsAction,
  getRoomStats,
  localDayKey,
} from "./metrics";

function room(id: number, status: HotelRoom["status"], isActive = true): HotelRoom {
  return { id, number: String(100 + id), floor: "1", roomType: "Deluxe", status, isActive, nightlyRateMinor: 350000 };
}

// Midday local times keep these tests independent of the machine's time zone.
function at(day: string, time = "12:00") {
  return new Date(`${day}T${time}:00`).toISOString();
}

function stay(
  id: string,
  operationalStatus: HotelStayListItem["operationalStatus"],
  extra: Partial<HotelStayListItem> = {},
): HotelStayListItem {
  return {
    id,
    status: "ACTIVE",
    operationalStatus,
    room: null,
    submittedAt: at("2026-10-01"),
    closedAt: null,
    checkedInAt: null,
    checkedOutAt: null,
    hotelAccessExpiresAt: null,
    guestName: `Guest ${id}`,
    companionCount: 0,
    identityAccess: { canViewDetails: true, canViewDocuments: true, reason: null },
    ...extra,
  } as unknown as HotelStayListItem;
}

const today = new Date("2026-10-03T12:00:00");

describe("room stats", () => {
  it("counts active rooms by status and computes occupancy", () => {
    const stats = getRoomStats([room(1, "OCCUPIED"), room(2, "OCCUPIED"), room(3, "VACANT"), room(4, "CLEANING")]);
    assert.deepEqual(stats, { active: 4, occupied: 2, vacant: 1, cleaning: 1, maintenance: 0, occupancyPercent: 50 });
  });
  it("ignores inactive rooms", () => {
    const stats = getRoomStats([room(1, "OCCUPIED"), room(2, "VACANT", false)]);
    assert.equal(stats.active, 1);
    assert.equal(stats.occupancyPercent, 100);
  });
  it("zero active rooms gives 0%, not NaN", () => {
    assert.equal(getRoomStats([]).occupancyPercent, 0);
  });
});

describe("daily movement", () => {
  it("returns one entry per day ending today, oldest first", () => {
    const days = getDailyMovement([], today, 7);
    assert.equal(days.length, 7);
    assert.equal(days[0]!.day, "2026-09-27");
    assert.equal(days[6]!.day, "2026-10-03");
  });
  it("counts arrivals by check-in day and departures by check-out day", () => {
    const stays = [
      stay("a", "CHECKED_IN", { checkedInAt: at("2026-10-03") }),
      stay("b", "CHECKED_OUT", { checkedInAt: at("2026-10-01"), checkedOutAt: at("2026-10-03") }),
      stay("c", "CHECKED_IN", { checkedInAt: at("2026-09-01") }),
    ];
    const days = getDailyMovement(stays, today, 7);
    assert.deepEqual(days.at(-1), { day: "2026-10-03", label: days.at(-1)!.label, arrivals: 1, departures: 1 });
    assert.equal(days.find((d) => d.day === "2026-10-01")!.arrivals, 1);
    assert.equal(days.reduce((sum, d) => sum + d.arrivals, 0), 2);
  });
  it("no stays gives zero counts", () => {
    assert.ok(getDailyMovement([], today, 7).every((d) => d.arrivals === 0 && d.departures === 0));
  });
});

describe("needs action and in-house", () => {
  const stays = [
    stay("late", "PENDING_CHECK_IN", { submittedAt: at("2026-10-03", "11:00") }),
    stay("early", "PENDING_CHECK_IN", { submittedAt: at("2026-10-03", "09:00") }),
    stay("in1", "CHECKED_IN", { checkedInAt: at("2026-10-01") }),
    stay("in2", "CHECKED_IN", { checkedInAt: at("2026-10-03") }),
    stay("out", "CHECKED_OUT", { checkedInAt: at("2026-09-30"), checkedOutAt: at("2026-10-02") }),
  ];
  it("lists pending check-ins oldest submission first and active rooms needing cleaning", () => {
    const result = getNeedsAction(stays, [room(1, "CLEANING"), room(2, "CLEANING", false), room(3, "VACANT")]);
    assert.deepEqual(result.waiting.map((s) => s.id), ["early", "late"]);
    assert.deepEqual(result.toClean.map((r) => r.id), [1]);
  });
  it("lists checked-in stays, most recent check-in first", () => {
    assert.deepEqual(getInHouse(stays).map((s) => s.id), ["in2", "in1"]);
  });
  it("counts arrivals today", () => {
    assert.equal(countArrivalsToday(stays, today), 1);
  });
  it("local day key is YYYY-MM-DD", () => {
    assert.equal(localDayKey(new Date("2026-10-03T12:00:00")), "2026-10-03");
  });
});
```

If `identityAccess`'s real shape differs, keep the `as unknown as HotelStayListItem` cast and adjust the literal to match `hotelIdentityAccessSchema` in `packages/contracts/src/check-in.ts` — the metrics never read it.

- [ ] **Step 2: Run tests — expect FAIL** (module `./metrics` not found).

- [ ] **Step 3: Implement `metrics.ts`**

```ts
import type { HotelRoom, HotelStayListItem } from "@tattvix/contracts";

export type RoomStats = {
  active: number;
  occupied: number;
  vacant: number;
  cleaning: number;
  maintenance: number;
  occupancyPercent: number;
};

export function getRoomStats(rooms: HotelRoom[]): RoomStats {
  const active = rooms.filter((room) => room.isActive);
  const count = (status: HotelRoom["status"]) =>
    active.filter((room) => room.status === status).length;
  const occupied = count("OCCUPIED");
  return {
    active: active.length,
    occupied,
    vacant: count("VACANT"),
    cleaning: count("CLEANING"),
    maintenance: count("MAINTENANCE"),
    occupancyPercent: active.length === 0 ? 0 : Math.round((occupied / active.length) * 100),
  };
}

export function localDayKey(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const dayLabel = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric" });

export type DayMovement = { day: string; label: string; arrivals: number; departures: number };

// Aggregates by the browser's local day. At pilot scale this runs over the
// full stays list; at volume it should become a server-side summary.
export function getDailyMovement(
  stays: HotelStayListItem[],
  today: Date,
  days = 7,
): DayMovement[] {
  const result: DayMovement[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    result.push({ day: localDayKey(date), label: dayLabel.format(date), arrivals: 0, departures: 0 });
  }
  const byDay = new Map(result.map((entry) => [entry.day, entry]));
  for (const stay of stays) {
    if (stay.checkedInAt) {
      const entry = byDay.get(localDayKey(new Date(stay.checkedInAt)));
      if (entry) entry.arrivals += 1;
    }
    if (stay.checkedOutAt) {
      const entry = byDay.get(localDayKey(new Date(stay.checkedOutAt)));
      if (entry) entry.departures += 1;
    }
  }
  return result;
}

export type NeedsAction = { waiting: HotelStayListItem[]; toClean: HotelRoom[] };

const time = (value: string | null) => (value ? new Date(value).getTime() : 0);

export function getNeedsAction(stays: HotelStayListItem[], rooms: HotelRoom[]): NeedsAction {
  return {
    waiting: stays
      .filter((stay) => stay.operationalStatus === "PENDING_CHECK_IN")
      .sort((a, b) => time(a.submittedAt) - time(b.submittedAt)),
    toClean: rooms.filter((room) => room.isActive && room.status === "CLEANING"),
  };
}

export function getInHouse(stays: HotelStayListItem[]): HotelStayListItem[] {
  return stays
    .filter((stay) => stay.operationalStatus === "CHECKED_IN")
    .sort((a, b) => time(b.checkedInAt) - time(a.checkedInAt));
}

export function countArrivalsToday(stays: HotelStayListItem[], today: Date): number {
  const key = localDayKey(today);
  return stays.filter((stay) => stay.checkedInAt && localDayKey(new Date(stay.checkedInAt)) === key).length;
}
```

- [ ] **Step 4: Run tests — expect PASS** (34 existing + 10 new = 44). Run types — exit 0.
- [ ] **Step 5: Stop — leave unstaged.**

---

### Task 3: Overview page

**Files:**
- Create: `apps/web/src/features/hotel-overview/components/room-status-chart.tsx`
- Create: `apps/web/src/features/hotel-overview/components/movement-chart.tsx`
- Create: `apps/web/src/features/hotel-overview/components/hotel-overview-page.tsx`
- Modify (rewrite): `apps/web/src/routes/_auth/_hotel/hotel/$organizationSlug/$propertySlug/dashboard.tsx`

**Interfaces — Consumes:** Task 1 primitives; Task 2 metrics; `hotelStayQueries.list(org, prop)` (no query arg → all stays; response `{ stays }`); `hotelOperationsQueries.rooms(org, prop)` (response `{ rooms }`); `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `type ChartConfig` from `@tattvix/ui/components/chart`; `PageHeader`, `EmptyState` from design-system.

- [ ] **Step 1: Charts**

`room-status-chart.tsx`:
```tsx
import { ChartContainer, type ChartConfig } from "@tattvix/ui/components/chart";
import { Cell, Pie, PieChart } from "recharts";

import type { RoomStats } from "../metrics";

const config = {
  occupied: { label: "Occupied", color: "var(--chart-1)" },
  vacant: { label: "Vacant", color: "var(--chart-4)" },
  cleaning: { label: "Cleaning", color: "var(--chart-3)" },
  maintenance: { label: "Maintenance", color: "var(--chart-5)" },
} satisfies ChartConfig;

const keys = ["occupied", "vacant", "cleaning", "maintenance"] as const;

export function RoomStatusChart({ stats }: { stats: RoomStats }) {
  const data = keys.map((key) => ({ key, value: stats[key] }));
  return (
    <div className="grid items-center gap-6 sm:grid-cols-[160px_1fr]">
      <div className="relative mx-auto size-40">
        <ChartContainer config={config} className="aspect-square size-40">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="key" innerRadius={52} outerRadius={72} strokeWidth={2} isAnimationActive={false}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-2xl font-semibold tabular-nums">{stats.active}</span>
          <span className="text-xs text-subtle-foreground">active rooms</span>
        </div>
      </div>
      <ul className="grid gap-2.5 text-sm">
        {keys.map((key) => (
          <li key={key} className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: config[key].color }} aria-hidden />
            <span className="flex-1 text-muted-foreground">{config[key].label}</span>
            <span className="font-medium tabular-nums">{stats[key]}</span>
            <span className="w-10 text-right text-xs text-subtle-foreground tabular-nums">
              {stats.active ? Math.round((stats[key] / stats.active) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`movement-chart.tsx`:
```tsx
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@tattvix/ui/components/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { DayMovement } from "../metrics";

const config = {
  arrivals: { label: "Arrivals", color: "var(--chart-1)" },
  departures: { label: "Departures", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function MovementChart({ data }: { data: DayMovement[] }) {
  return (
    <ChartContainer config={config} className="h-56 w-full">
      <BarChart data={data} barGap={4}>
        <CartesianGrid vertical={false} stroke="var(--border-soft)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} width={24} tickLine={false} axisLine={false} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
        <Bar dataKey="arrivals" fill="var(--color-arrivals)" radius={3} maxBarSize={18} />
        <Bar dataKey="departures" fill="var(--color-departures)" radius={3} maxBarSize={18} />
      </BarChart>
    </ChartContainer>
  );
}
```

- [ ] **Step 2: Page component** — `hotel-overview-page.tsx`. Build exactly this structure (reference: `docs/design/reference/overview.jpg`, minus omitted widgets):

```tsx
export function HotelOverviewPage({ organizationSlug, propertySlug }: { organizationSlug: string; propertySlug: string }) {
  const { data: stayData } = useSuspenseQuery(hotelStayQueries.list(organizationSlug, propertySlug));
  const { data: roomData } = useSuspenseQuery(hotelOperationsQueries.rooms(organizationSlug, propertySlug));
  const today = new Date();
  const stats = getRoomStats(roomData.rooms);
  const { waiting, toClean } = getNeedsAction(stayData.stays, roomData.rooms);
  const inHouse = getInHouse(stayData.stays);
  const movement = getDailyMovement(stayData.stays, today, 7);
  const params = { organizationSlug, propertySlug };

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6">
      <PageHeader
        title="Today"
        meta={new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(today)}
      />
      <KpiStrip>
        <Kpi icon={Gauge} label="Occupancy" value={`${stats.occupancyPercent}%`} detail={`${stats.occupied} of ${stats.active} rooms`} />
        <Kpi icon={BedDouble} label="In house" value={inHouse.length} detail="stays" />
        <Kpi icon={LogIn} label="Arrivals today" value={countArrivalsToday(stayData.stays, today)} />
        <Kpi icon={Clock} label="Waiting for a room" value={waiting.length} />
        <Kpi icon={Sparkles} label="Rooms to clean" value={toClean.length} />
      </KpiStrip>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <PanelHeader title="Needs action" icon={CircleDot} meta={waiting.length + toClean.length} />
          <div className="grid md:grid-cols-[minmax(0,1fr)_220px] md:divide-x md:divide-border-soft">
            {/* Waiting for a room: rows = initials avatar (bg-muted) · name + "+N · submitted HH:mm" (one line, truncate) · Button size="sm" (default variant for the FIRST row only, outline for the rest) "Assign room" linking to /hotel/$organizationSlug/$propertySlug/stays/$stayId. Empty: "No one is waiting." */}
            {/* To clean: rows = room number (font-medium tabular-nums) + roomType (subtle). Footer link "Open rooms" to /hotel/$organizationSlug/$propertySlug/rooms. Empty: "All rooms are ready." */}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Rooms right now" icon={LayoutGrid} actions={/* link "Open rooms" (text-sm text-primary underline-offset-4 hover:underline) */} />
          <PanelSection>{stats.active === 0 ? <EmptyState …"No rooms yet"… action=link to rooms /> : <RoomStatusChart stats={stats} />}</PanelSection>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Arrivals and departures" icon={BarChart3} meta="Last 7 days" />
        <PanelSection><MovementChart data={movement} /></PanelSection>
      </Panel>

      <Panel>
        <PanelHeader title="In house" icon={BedDouble} meta={inHouse.length} actions={/* "View all stays" link to …/stays */} />
        {/* table: header row bg-muted text-xs text-subtle-foreground (Guest · Room · Type · Checked in · Status); rows h-11 border-t border-border-soft hover:bg-muted/50; whole row is a Link to the stay detail; Status = <StatusPill tone="success">Checked in</StatusPill>; Room from stay.room?.number ?? "—", Type from stay.room?.roomType ?? "—" (check stayRoomSummarySchema for exact field names). Empty: EmptyState "No guests in house". */}
      </Panel>
    </div>
  );
}
```

Icons from `lucide-react`: `Gauge, BedDouble, LogIn, Clock, Sparkles, CircleDot, LayoutGrid, BarChart3`. Times formatted with `Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" })`. Fill the commented regions exactly as described; keep row heights 44px (`h-11`) and 20px horizontal padding (`px-5`).

- [ ] **Step 3: Route** — rewrite `dashboard.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { HotelOverviewPage } from "@/features/hotel-overview/components/hotel-overview-page";
import { hotelOperationsQueries } from "@/features/hotel-operations/queries";
import { hotelStayQueries } from "@/features/hotel-stays/queries";

export const Route = createFileRoute(
  "/_auth/_hotel/hotel/$organizationSlug/$propertySlug/dashboard",
)({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        hotelStayQueries.list(params.organizationSlug, params.propertySlug),
      ),
      context.queryClient.ensureQueryData(
        hotelOperationsQueries.rooms(params.organizationSlug, params.propertySlug),
      ),
    ]),
  component: PropertyDashboardRoute,
});

function PropertyDashboardRoute() {
  const params = Route.useParams();
  return (
    <HotelOverviewPage
      organizationSlug={params.organizationSlug}
      propertySlug={params.propertySlug}
    />
  );
}
```

- [ ] **Step 4: Verify**

```bash
grep -rn "hotelReportsQueries\|hotel-reports" apps/web/src/features/hotel-overview "apps/web/src/routes/_auth/_hotel/hotel/\$organizationSlug/\$propertySlug/dashboard.tsx"
```
Expected: no output (Reception must be able to load this page). Tests pass (44). Types exit 0.

Browser (reviewer): Overview at 1440 and 1280 wide matches the reference structure; donut shows correct counts; bar chart has 7 days ending today; "Assign room" opens the stay; in-house rows open their stay; empty states render on a property with no rooms/stays.

- [ ] **Step 5: Stop — leave unstaged.**

---

### Task 4: Stay detail — two-column layout

**Files:** Modify `apps/web/src/features/hotel-stays/components/hotel-stay-detail-page.tsx`, `apps/web/src/features/hotel-stays/components/stay-bill-panel.tsx`.

**Rules (read before editing):**
- Keep every hook, query, mutation, `ConfirmDialog`, `printContentRef`, `useReactToPrint` and `imageQueries` exactly as they are. You are moving and restyling JSX, not changing behaviour. `git diff` of lines containing `useQuery`, `useQueries`, `useSuspenseQuery`, `useMutation`, `.mutate(`, `imageAccess`, `useReactToPrint` must show no changes.
- Keep the `stay-print-*` class names on the elements that carry them today (print CSS depends on them); move them with their content.
- Replace every `Surface` in these two files with `Panel` / `PanelHeader` / `PanelSection`. Remove `SectionHeading` icon tiles; section titles are 14px semibold with an optional 16px grey icon.
- No room photo (spec decision: omit until a photo field exists).
- Copy: keep it operational. Delete sentences that explain authorization/audit internals; the only access copy allowed is one 12px line, e.g. `ID access ends {date}`. (There is no Reveal action — never mention one.)

- [ ] **Step 1: Target structure** of `HotelStayDetailPage`'s return:

```tsx
<div className="mx-auto grid max-w-[1400px] gap-6">
  {/* small ghost "Back to stays" link stays as-is */}
  <div ref={printContentRef} className="stay-print-root grid gap-6">
    {/* HEADER (no box): initials avatar (size-10 rounded-full bg-muted) · guest name (22px semibold) · StatusPill
        (PENDING_CHECK_IN → warning "Waiting for a room"; CHECKED_IN → success "Checked in"; CHECKED_OUT → neutral "Checked out")
        meta line (text-sm text-subtle-foreground): "Room {n} · {roomType} · Floor {floor} · {1 + companions} guests" — omit parts that are null.
        right: Print (variant="ghost", same disabled/title/label logic as today, keep stay-print-actions class) + the ONE primary state action:
          CHECKED_IN && canCheckout → Button "Check out" (opens existing checkout ConfirmDialog). Otherwise none here. */}
    {/* FACTS ROW: <FactsRow> with Fact for: Submitted, Checked in, Checked out (only if set). Not Room — it's already in the header meta line — use existing formatDateTime. */}
    {/* error alert (existing) */}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid h-fit gap-6">
        {/* PENDING_CHECK_IN only: the existing check-in form (room select + nights + "Confirm check-in" primary) inside
            <Panel><PanelHeader title="Assign a room" icon={BedDouble} /><PanelSection>…</PanelSection></Panel>.
            This is the page's primary action in this state. Keep the existing disabled/explanation logic. */}
        {/* CHECKED_OUT: one Panel with the existing completed message condensed to a single line + time. */}
        <StayBillPanel … />  {/* restyled in Step 2 */}
      </div>
      <Panel className="h-fit">
        {stay.snapshot ? (
          <>
            <PanelSection>{/* GUEST: title "Guest" (+ UserRound icon); 2-col label-over-value grid (text-xs subtle label, text-sm value): phone, date of birth, nationality, address (full width). Content from today's GuestIdentity. */}</PanelSection>
            <PanelSection>{/* IDENTITY: title "Identity"; ONE line "{documentTypeLabel} · {number}"; below in 12px subtle "Issued by {country} · expires {date}";
                 a text button "View images" / "Hide images" (local useState, default hidden) that toggles DISPLAY of the existing DocumentImage grid.
                 The imageQueries keep running exactly as today — hiding is visual only. Then one 12px line about access (see Rules). */}</PanelSection>
            <PanelSection>{/* COMPANIONS: title "Companions" + count; each companion = name + relation · DOB on one line, document type · number on the next; their images behind the same View/Hide toggle pattern. Content from today's CompanionIdentity. */}</PanelSection>
          </>
        ) : (
          <PanelSection>{/* condensed ExpiredIdentity: title "Identity", one sentence, no icon tile */}</PanelSection>
        )}
      </Panel>
    </div>
  </div>
  {/* ConfirmDialogs unchanged */}
</div>
```

Delete `OperationalStayPanel`'s CHECKED_IN branch (its content moves to the header button) and `AccessPolicy` (replaced by the one-line access copy). Keep `formatDate`, `formatDateTime`, `documentTypeLabel`.

- [ ] **Step 2: `StayBillPanel` restyle** (same data, same mutations, same permission checks):
  - Wrap in `Panel`; `PanelHeader title="Bill" icon={Receipt}` with `meta` = `<StatusPill tone={bill.isFinal ? "neutral" : "success"}>{bill.isFinal ? "Final" : "Open"}</StatusPill>` and `actions` = the existing "Add charge" trigger as `variant="outline" size="sm"` (only when allowed today).
  - Table: header `bg-muted text-xs text-subtle-foreground` (Item · Qty · Unit · Amount, numbers right-aligned, `tabular-nums`); rows `h-[52px] border-t border-border-soft px-5`; item name 14px with a 12px subtle subline (kind/date). Row action buttons (void etc.) render inside a cell with `opacity-0 group-hover:opacity-100 focus-within:opacity-100` on a `group` row — still reachable by keyboard.
  - Voided rows: `text-subtle-foreground line-through` on name and amounts + `<StatusPill tone="danger">Void</StatusPill>`; void reason in the subline.
  - Footer: left 12px subtle summary (e.g. "Room ₹10,500 + extras ₹2,000" using existing money formatting), right total `text-2xl font-semibold tabular-nums`; under it one 12px subtle line "Checking out finalises this bill." (only when not final).
  - Remove tinted note boxes and icon tiles.

- [ ] **Step 3: Verify code** — types exit 0; tests pass (44). Then:

```bash
git diff -U0 apps/web/src/features/hotel-stays/components | grep -E "^[-+].*(useQuery|useQueries|useSuspenseQuery|useMutation|\.mutate\(|imageAccess|useReactToPrint)"
```
Expected: no output.

- [ ] **Step 4: Stop — leave unstaged.**

- [ ] **Step 5: Browser (reviewer)** — one stay in each state:
  - Pending: "Assign a room" panel is the only primary; choosing a room without a rate keeps confirm disabled with the existing explanation; confirming still checks in.
  - Checked in: header "Check out" opens the dialog; bill add-charge and void work; row actions appear on hover and on keyboard focus.
  - Checked out: neutral pill; bill shows Final; no primary button.
  - Snapshot expired: identity section shows the ended line.
  - "View images" toggles images; Print still produces the same output as before (images included).
  - Layout at 1440, 1280 and 390 wide; side panel drops below main on mobile.
