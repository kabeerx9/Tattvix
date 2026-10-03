# Web visual redesign — "A3.1" (deep teal on white)

Status: draft for review · 2026-10-03
Scope: `apps/web` + `packages/ui` only. Light theme only. Native app untouched.
Decision record: `docs/adr/0001-web-visual-language.md`
Visual reference (frozen): `docs/design/reference/` (`a3.1-prototype.html`, `overview.jpg`, `stay-detail.jpg`)

## 1. Problem

The web app reads as templated ("vibe-coded") and the operational screens are hard to work in. The
cause is the design system itself, not individual screens — `docs/design-system.md` mandated the
patterns that produce it, and every screen followed it faithfully:

| Symptom (observed in the running app) | Rule that produced it |
|---|---|
| ~170px hero (eyebrow + 36px title + paragraph) before any content | "Page title 30–36px", "Eyebrows use `app-kicker`", `PageHeader` |
| Hotel overview is three link cards, no data | "Optional metric row" + no rule that a dashboard shows data |
| Stay detail is a vertical stack of large cards, ~3 screens of scroll | "Cards 16px / hero panels 20–24px", "category icon in 40–48px tinted container" |
| Copy explains internals ("property-scoped and added to the access audit") | No copy rule against implementation detail in staff UI |
| Generic typography | Theme names `"Inter Variable"` but nothing loads it → system fallback (Helvetica on macOS) |

## 2. Decision

Adopt prototype **A3.1**: white canvas, one deep-teal accent, cool greys, Inter, 8px radius,
hairline borders, line icons, real imagery where the data supports it. Chosen after five rounds
(A, B, C, A2, A3 → A3.1); rejected options and reasons are in the ADR.

## 3. Out of scope

- Dark theme (hidden, not maintained — see §9).
- Native app (`apps/native`) and its section of `docs/design-system.md`.
- Changing organization/property slugs (see §8, B4) — data + public-URL change, separate decision.
- New backend endpoints and the room-photo field (§7) — tracked as dependencies; screens ship
  without the dependent widgets rather than with fake data.
- Guest-facing check-in flow redesign (`/check-in/$token`) beyond token/typography inheritance.
  It is mobile-first and trust-sensitive; it gets its own prototype round.

## 4. Theme tokens (`packages/ui/src/styles/globals.css`, `:root`)

Hex values from the prototype; implementation may express them in oklch, but must match visually.

| Token | Value | Use |
|---|---|---|
| `--background` | `#FFFFFF` | page canvas |
| `--foreground` | `#0F1720` | primary text |
| `--card` / `--popover` | `#FFFFFF` | panels, menus |
| `--muted` | `#F2F4F7` | table header, nested fills, neutral pill |
| `--muted-foreground` | `#475467` | secondary text |
| `--subtle-foreground` *(new)* | `#8A94A3` | labels, meta, timestamps |
| `--border` | `#E7E9EC` | panel + control borders |
| `--border-soft` *(new)* | `#F0F1F3` | row dividers inside panels |
| `--input` | `#E7E9EC` | input borders |
| `--primary` | `#0F5F5C` | primary button, active nav text, chart series 1, links |
| `--primary-hover` *(new)* | `#0B4A47` | primary hover |
| `--primary-foreground` | `#FFFFFF` | |
| `--accent` | `#F2F4F7` | **neutral** hover/highlight (shadcn menus, selects). *Was teal tint in the first cut — that turned every menu hover and icon tile green; corrected 2026-10-03.* |
| `--accent-foreground` | `#0F1720` | |
| `--primary-tint` *(new)* | `#E8F3F2` | KPI icon tile only |
| `--ring` | `#0F5F5C` @ 40% | focus ring |
| `--success` / `--success-tint` *(new)* | `#0F5F5C` / `#E8F3F2` | "Checked in", positive delta |
| `--warning` / `--warning-tint` *(new)* | `#B54708` / `#FEF4E6` | due today, pending |
| `--destructive` / `--destructive-tint` *(tint new)* | `#B42318` / `#FEECEB` | void, errors, negative delta |
| `--chart-1` | `#0F5F5C` | primary series |
| `--chart-2` | `#C9CED6` | comparison series |
| `--chart-3` | `#F0B86E` | "cleaning" status in room donut |
| `--chart-4` | `#8FCFC9` | "vacant" status |
| `--chart-5` | `#D0D5DD` | "maintenance" status |
| `--sidebar` | `#FFFFFF` (hairline right border) | |
| `--radius` | `0.5rem` (8px) | shifts the whole `rounded-*` scale down |
| shadow | `0 1px 2px rgb(16 24 40 / 0.04)` | panels only; no other shadows |

New tokens are registered in `@theme inline` so they're usable as Tailwind classes
(`text-subtle-foreground`, `bg-warning-tint`, …). Status colours stop being raw
`emerald-*`/`amber-*` utility classes in feature code.

**Font:** load Inter (variable) via `@fontsource-variable/inter` in `apps/web` and enable
`font-feature-settings: "cv11", "ss01"` globally plus `tabular-nums` on numeric cells/KPIs.

**Remove:** `.app-kicker`, the heavy `.app-surface` shadow, all `.dark` usage paths in UI (§9).

## 5. Type, spacing, density

| Element | Spec |
|---|---|
| Page title | 22px / 600, tight tracking; date or count beside it in 14px subtle |
| Section / panel title | 14px / 600, optional 16px grey line icon |
| Body | 14px; labels 12px `subtle-foreground` above values |
| KPI value | 28px / 600, tabular |
| Page padding | 32px desktop, 16px mobile |
| Gap between panels | 24px |
| Panel padding | 20–24px |
| Table rows | 44px (lists), 52px (bill); header row `bg-muted`, 12px labels |
| Icons | Lucide 16px, stroke 1.75; KPI icons in a 28px `bg-primary-tint` square (radius 6) — the only tinted icon tiles allowed |

## 6. Composition rules (the ones that fixed the clutter)

1. **No hero headers.** Title row + one primary action. No eyebrow, no description paragraph.
2. **No box in a box.** A panel's internal sections are separated by hairline dividers, never
   nested cards. Facts rows (checked in / due out / bill) are plain text, not bordered cells.
3. **One fact, one place.** If room/rate/status is in the header it does not reappear below.
4. **One primary action per page.** Secondary actions live where they apply (e.g. "Add charge" on
   the bill, not in the page header).
5. **Main + side.** Detail screens use two columns (~64/36): the work (bill, table) on the left,
   context (guest, companions, identity, activity) in one side panel on the right.
6. **Rare content collapses.** Identity images are behind "View images". (A masked number with an
   audited "Reveal" would need a server-side audit event; not built — don't imply it in copy.)
7. **Row actions on hover**, always reachable by keyboard focus.
8. **Data, not navigation, on dashboards.** No "link card" tiles.
9. **Operational copy only.** Never explain how authorization, audit, or storage works in staff
   UI; one short line (e.g. "ID access ends 4 Oct, 17:17") is the max.
10. **Imagery only from real data.** Never show stock photos as if they were the hotel's.
    Until §7 lands, image slots are omitted (property switcher shows an initials tile instead).

## 7. Backend dependencies (not part of this redesign's UI work)

| Widget | Status today | Needed |
|---|---|---|
| KPIs: occupancy, in-house, room status donut, pending list, in-house table | Live (`/reports/occupancy`, status counts, in-house) | — |
| Arrivals vs departures chart | Derivable client-side from the register report | — |
| Revenue this week, ADR | No aggregate | revenue report endpoint over `stayBill` totals |
| Occupancy trend (7/30 days) | Snapshot only | daily occupancy history (materialized or computed from stays) |
| Room-type photos, property cover | No field | image field on room type + property, upload via existing object storage |

Screens ship **without** the widgets in rows 3–5 until the endpoint exists. No placeholder numbers.

## 8. Bugs fixed as part of the port (verified in source)

- **B1** Stays status filter shows raw `__all__` — `features/hotel-stays/components/hotel-stays-page.tsx:42,160`: `<SelectValue />` has no label mapping for the sentinel. Same pattern in `platform-oversight/components/oversight-page.tsx:295`.
- **B2** *My hotels* card body isn't clickable; only the 40px arrow `Link` is — `routes/_auth/_hotel/hotel/index.tsx`. Whole row becomes the link.
- **B3** Header shows an organization + role on *My hotels* before one is chosen — `lib/workspace-navigation.ts:43` falls back to `accessible[0]` when the URL has no organization, and `components/app-shell.tsx:98` renders that as the current hotel. Replaced by the property switcher, which shows "Choose a hotel" when none is active.
- **B4** *(not fixed here — decision needed)* URLs read `/hotel/<name>-request-2/hotel/…`: `apps/server/api/hotel_registration.py:79` always appends `-request-{id}` on approval and hard-codes property slug `"hotel"`. Changing it alters public URLs and existing rows (needs redirect or migration). Logged for a separate decision.
- **B5** Duplicate nav: "Hotel details" and "Hotel & properties" (same icon) — `app-shell.tsx:343,366`. Merged into "Property settings".

## 9. Theme lock (dark mode off)

- `next-themes` forced to `light`; `ModeToggle` removed from the header.
- `.dark` block in `globals.css` left in place but marked unmaintained. Not deleted, so reviving
  dark mode later is additive.
- `AGENTS.md` rule "New screens must work in light and dark themes" changed to light-only until
  further notice. *(Already done alongside this spec, so agents don't follow a rule that
  contradicts the new `docs/design-system.md`.)*

## 10. Shared components (`apps/web/src/components/design-system.tsx`)

Replace, don't add alongside:

| Old | New |
|---|---|
| `PageHeader` (eyebrow/title/description) | `PageHeader` — `title`, optional `meta`, optional `actions` |
| `MetricCard` | `KpiStrip` + `Kpi` — one bordered container, vertical dividers, icon tile, value, delta pill |
| `Surface` (heavy) | `Panel` + `PanelHeader` + `PanelSection` (divider-separated) |
| — | `FactsRow` — label-over-value inline facts, no borders |
| ad-hoc pills | `StatusPill` — `tone: success | warning | danger | neutral` |
| — | `DataTable` styling conventions (muted header, row height, hover actions) — CSS/classes, not a table library |
| `EmptyState`, `ConfirmDialog`, `RouteErrorState` | kept, restyled by tokens only |

App shell: sidebar gets the **property switcher** at the top (cover image slot, name, city · role,
chevron menu listing memberships/properties) and flat nav: Overview · Stays (pending badge) · Rooms ·
Guests · Reports · Property settings. Workspace switch (Personal / Hotel / Admin) moves into the
user menu at the sidebar foot. Header: breadcrumb + search. The Personal/Hotel/Admin pill tabs go.

## 11. Port order

Each step is a reviewable unit and leaves the app working.

1. **Foundation** — tokens, font, theme lock, `AGENTS.md` rule. *(Restyles every page at once; old
   layouts in new colours is the expected intermediate state.)*
2. **Shared components** (§10) with no page changes yet.
3. **App shell** — property switcher, flat nav, user menu, header. Fixes B3, B5.
4. **Stay detail** (hotel) — closest to the reference. Charts not involved.
5. **Hotel overview** — KPIs + needs-action + room donut + arrivals/departures + in-house table.
   Requires a chart primitive (decision: shadcn `chart` (Recharts) vs hand-written SVG — see §13).
6. **Stays list** (B1), **Rooms**, **Guests**, **Reports**.
7. **Property settings** (merge details + properties), **My hotels** (B2).
8. **Personal workspace** — guest overview, my stays, travel profile, companions, privacy, account.
9. **Platform admin** — organizations, onboarding, requests, oversight (B1 second site).
10. Delete `docs/design/reference/` once 4 and 5 have shipped.

## 12. Verification

- `pnpm check-types` and `pnpm test` per step (existing suites; this is mostly presentational).
- Visual check of every ported page in the browser at 1440 and 1280 wide, and 390 wide for
  personal-workspace pages, compared against the reference for 4–5.
- Loading, empty, error and disabled states checked per page (unchanged requirement).
- Print: stay detail uses `react-to-print`; print output checked after step 4.

## 13. Open questions

1. ~~Chart primitive~~ — **Decided 2026-10-03: shadcn `chart` (Recharts)**, added to `@tattvix/ui`.
2. ~~Room photo on stay detail~~ — **Decided 2026-10-03: omit** the photo card until §7 lands;
   the main column starts with the bill.
3. ~~B4 slugs~~ — **Decided 2026-10-03: separate task, not part of this redesign.** Generate clean
   slugs on approval (suffix only on collision; property slug from property name) and rename
   existing pilot rows once, without a redirect table (pilot scale: no bookmarks worth keeping).
   Guest QR links use `/check-in/<token>` and are unaffected.
