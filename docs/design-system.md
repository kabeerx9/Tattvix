# Tattvix Web Design System

This document is the implementation contract for all Tattvix web UI. Decision records:
`docs/adr/0001-web-visual-language.md` (palette, density) and
`docs/adr/0002-airbnb-style-staff-shell.md` (hotel staff shell, card radius, shadows, titles).
Visual reference: `docs/design/reference/`.


## Product character

A calm, precise front-desk tool. White canvas, one deep-teal accent, cool greys. Density is a
feature: staff use it all day. Imagery adds warmth only where it comes from real data.

**Light theme only** until further notice. Do not add `dark:` variants.

## Foundation

Build with shadcn components from `@tattvix/ui`, then the composed patterns in
`apps/web/src/components/design-system.tsx`:

1. Existing `@tattvix/ui` component.
2. A pattern from `design-system.tsx` (`PageHeader`, `LargeTitle`, `SectionTitle`, `KpiStrip`, `Panel`/`PanelSection`, `FactsRow`, `StatusPill`, `EmptyState`, `ConfirmDialog`, `ResponsiveTable`, `ListRow`, `FilterBar`, `InitialsAvatar`, `PhotoTile`, `BottomTabBar`).
3. A feature component composed from those.
4. A new shared primitive only when none of the above can express the interaction.

No route-local buttons, cards, inputs, dialogs, dropdowns, comboboxes, sheets, tooltips, pills or empty states.

## Colour

Tokens live in `packages/ui/src/styles/globals.css`. Use them by name; never hardcode hex or raw
Tailwind palette colours (`emerald-*`, `amber-*`, `gray-*`) in feature code.

| Role | Token |
|---|---|
| Canvas, panels | `background`, `card` (white) |
| Text | `foreground` · `muted-foreground` (secondary) · `subtle-foreground` (labels, meta) |
| Lines | `border` (panels, controls) · `border-soft` (dividers inside a panel) |
| Fills | `muted` (table header, neutral pill) · `accent` (**neutral grey** — generic hover/highlight used by menus and selects) · `primary-tint` (KPI icon tile only) |
| Brand / action | `primary` (deep teal) — primary button, active nav text, links, chart series 1 |
| Status | `success` · `warning` · `destructive`, each with a `-tint` background |
| Charts | `chart-1` (teal) primary · `chart-2` (grey) comparison · `chart-3..5` room statuses |

Teal is the **only** accent, and it is rare: primary button, active nav item (`sidebar-accent`), links, success pills, KPI icon tiles. Everything else is white and grey. Do not use `accent`/`text-primary` to tint icons or boxes. Status colours carry meaning, never decoration. No gradients, glows,
multicolour metric cards, or purple.

## Shape and elevation

- Cards and panels: 16px radius via the `rounded-card` token (`--card-radius`). Controls stay 8px
  (`rounded-lg`); photo tiles 12px (`rounded-xl`); pills and filter tabs fully rounded.
- Card shadow: `shadow-card` (`--elevation-card`, a soft two-layer shadow) on top of the 1px
  `border`. Floating surfaces (sheets, menus) use `shadow-raised`. No other shadows.
- Change radius and shadows through the tokens in `globals.css`, never with one-off values.
- **No box in a box.** Sections inside a panel are separated by `border-soft` dividers, never by nested cards.

## Typography

Inter (variable) with `cv11`, `ss01`; `tabular-nums` for every number column, KPI and money value.

| Element | Size / weight |
|---|---|
| Large title (`LargeTitle`, hub pages like Today) | 30px / 700 (34px from `md`) with a 15px grey meta line; collapses into a centred 15px bar on scroll on phones |
| Page title (`PageHeader`) | 24px / 700 (28px from `md`), tight tracking — meta beside it in 14px `subtle-foreground` |
| Section title (`SectionTitle`) | 22px / 600 with an optional grey line under it |
| Panel title | 14px / 600, optional 16px line icon |
| Body | 14px |
| Label (above a value) | 12px `subtle-foreground` |
| KPI value | 28px / 600 |

Sentence case everywhere. No uppercase eyebrows.

## Layout and spacing

- Content max width ~1400px. Page padding 32px (16px on mobile).
- 24px between panels, 20–24px inside panels, 12–16px inside related groups.
- Lists: 44px rows; bill/ledger: 52px rows. Table header `bg-muted`, 12px labels.
- Mobile collapses to one column; side panels move below the main column.
- Tables use `ResponsiveTable`: a grid table when its container is wide enough, a divided list of
  `ListRow`s when it isn't (a container query, so it also adapts beside an expanded sidebar). Pick
  `switchAt` as the smallest size where every column fits. Never ship a table that scrolls sideways
  on a phone.
- Filters above a list go in a `FilterBar`: full-width stacked controls on a phone.
- Groups of cards that would stack into a long column on a phone go in a `Rail` (`@tattvix/ui`):
  a scroll-snap row that bleeds to the screen edge, switching to a grid at `md`.
- Pick-one filters with counts ("Arriving (3)") use `PillTabs` (`@tattvix/ui`): a tablist of
  rounded pills that scrolls sideways instead of wrapping.

## Hotel staff shell

Hotel staff routes (`/hotel/...`) use `HotelShell` (`apps/web/src/components/hotel-shell.tsx`),
not the sidebar. Personal and platform-admin workspaces keep the sidebar `AppShell`.

- **`md` and up:** sticky top nav — logo left, section links centred (active = foreground text
  with an underline), account menu right (property cover + name, switcher, workspaces, sign out).
- **Phones:** `BottomTabBar` with Today, Stays, Rooms, Guests and **Menu**. Menu opens a
  `BottomSheet` with the remaining destinations (Reports, Property settings), the hotel switcher
  and account links. Which items become tabs is decided by `splitHotelNavForTabBar` in
  `lib/workspace-navigation.ts`; permission gating stays in `getHotelNavItems`.
- Main content leaves room for the tab bar and the safe areas (`--tab-bar-height`,
  `env(safe-area-inset-*)`). Toasts lift above the tab bar automatically (`--toast-clearance`).
- Do not add another fixed bottom element on phones; put actions in the page or a sheet.

## Page anatomy

1. **Header row:** title (+ meta) on the left, at most one primary action on the right. No eyebrow, no description paragraph, no hero.
2. **Optional `KpiStrip`:** one bordered container with vertical dividers — not separate cards.
3. **Work area.** Detail screens use **main + side** (~64/36): the task (bill, table, form) in main; context (guest, companions, identity, activity) in a single side `Panel` with divided sections.

## Density over austerity

Screens should feel full and alive at real data volumes (see `docs/design/reference/overview.jpg`):
avatars on people, neutral category tiles on destinations, KPI strips above lists, status pills,
charts where there is a trend, imagery where real photos exist, and a short orienting line where
a newcomer would wonder what an area is for. The rules below remove **noise** (boxes in boxes,
repeated facts, internals copy, teal tints) — never **information**. Judge a screen with seeded
data (`pnpm seed -- --email <you>`), not an empty dev database.

## Composition rules

1. **One fact, one place.** Room, rate, dates or status shown in the header don't repeat below.
2. **One primary action per page.** Secondary actions sit where they apply ("Add charge" on the bill).
3. **Rare content collapses** behind a link ("View images").
4. **Row actions appear on hover/focus**, never permanently on every row — on mouse devices only (`rowActionsRevealClassName`); touch screens always show them.
5. **Dashboards show data.** No tiles that only link elsewhere.
6. **Facts rows are plain text** (label over value), not bordered cells.

## Components and interactions

- Buttons: `default` (teal) for the one primary; `outline` for secondary; `ghost` for tertiary (Print).
- Inputs: visible labels; placeholder is an example, not the label. Selects must render the selected option's **label**, never its raw value.
- Remote-record selection uses a shadcn Combobox with loading, empty and error states.
- Focused tasks started from a card (assign a room, check out, change room status) open in a
  `BottomSheet` (`@tattvix/ui`): a drag-to-dismiss sheet on phones, a centred dialog from 768px.
  One primary action in its footer. Use `Dialog` only for confirmations.
- Pressable cards use the `press` class (scale 0.97 while pressed). Motion uses `--ease-out-strong`
  for UI and `--ease-drawer` for sheets; everything honours `prefers-reduced-motion`.
- Whole rows/cards that navigate are the link — not just a small arrow inside them.
- Empty states: what belongs here + one useful next action.
- Navigation: sidebar active item = `sidebar-accent` fill (teal tint) + `primary` text; top nav
  active item = foreground text + underline; tab bar active item = `primary` icon and label.
  Inactive items quiet.
- Icons: Lucide, 16px, stroke 1.75, `muted-foreground`. The only tinted icon tile is the 28px KPI icon (`bg-primary-tint text-primary`).

## Imagery

- **Hotel imagery is real data only:** property cover and room-type photos uploaded in Property
  settings. Where a layout is built around a photo (room tiles on Today, room choices in a sheet),
  a missing photo shows a quiet `muted` tile with a line icon so the grid stays even; elsewhere
  omit the slot.
- **Guest-facing pages may use decorative travel photography** to feel alive: the guest home hero,
  destination cards, and a `PageCover` strip under personal page headers. Sources live in
  `apps/web/public/images/travel` (self-hosted WebP, credits in `CREDITS.md`), referenced through
  `lib/travel-images.ts`. Decorative images use `alt=""` and never carry information.
- Never present stock imagery as a hotel's own property or rooms.
- Text over a photo needs a scrim (`bg-gradient-to-t from-black/60`) for legibility; that's the only
  gradient allowed.
- People get initials avatars; we don't store photos of guests.

## Content style

Operational and short: "3 waiting for a room", "Due 11:00". Never explain how authorization,
auditing or storage work in staff UI — one short line at most ("ID access ends 4 Oct, 17:17"). Never describe an audit or
action the UI doesn't actually have.

## Review checklist

- Built from `@tattvix/ui` + `design-system.tsx` patterns; no route-local primitives.
- Semantic tokens only; no raw palette classes, no `dark:` variants.
- No hero header, no eyebrow, no box in a box, each fact once, one primary action.
- Numbers tabular; selects show labels; clickable rows are fully clickable.
- Loading, empty, error, disabled and narrow-screen states covered.
- No implementation/debug detail in user-facing copy.

## Native application

The native app uses the same product character and semantic decisions, adapted for touch interfaces. Its implementation lives in `apps/native/src/design-system`.

> Not yet updated for the 2026-10 web redesign; native visuals intentionally diverge from web for now.

- Use `useAppTheme()` instead of hardcoded structural colors.
- Use `Screen`, `Card`, `PageHeader`, `IconTile`, `AppButton`, `AppInput`, and `GuestPage` before creating new native primitives.
- Maintain 48–50px touch targets, 12px control radii, 18px card radii, and 20px screen gutters.
- Bottom navigation is limited to guest Home, Profile, Companions, Privacy, and Account.
- Native content is guest-facing. Do not expose platform roles, hotel memberships, operational dashboards, internal IDs, or debug/API details.
- Support the device light/dark setting automatically.
