# Tattvix Web Design System

This document is the implementation contract for all Tattvix web UI. Decision records:
`docs/adr/0003-host-shell-and-accent-restraint.md` (palette, accent restraint, the one app shell,
logo, motion tokens), `docs/adr/0002-airbnb-style-staff-shell.md` (card radius, shadows, titles,
Today) and `docs/adr/0001-web-visual-language.md` (density and composition).
Visual reference: `docs/design/reference/`.


## Product character

A calm, precise front-desk tool. White canvas, warm-neutral greys, one rose accent used sparingly. Density is a
feature: staff use it all day. Imagery adds warmth only where it comes from real data.

**Light theme only** until further notice. Do not add `dark:` variants.

## Foundation

Build with shadcn components from `@tattvix/ui`, then the composed patterns in
`apps/web/src/components/design-system.tsx`:

1. Existing `@tattvix/ui` component.
2. A pattern from `design-system.tsx` (`PageHeader`, `LargeTitle`, `SectionTitle`, `KpiStrip`, `Panel`/`PanelSection`, `FactsRow`, `StatusPill`, `EmptyState`, `ConfirmDialog`, `ResponsiveTable`, `ListRow`, `FilterBar`, `InitialsAvatar`, `PhotoTile`, `BottomTabBar`), plus `BrandLogo` in `apps/web/src/components/brand.tsx`.
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
| Fills | `muted` (table header, neutral pill, empty photo slot) · `accent` (**neutral grey** — generic hover/highlight used by menus and selects) · `primary-tint` (neutral grey, kept for compatibility; accent tints are retired) |
| Brand / action | `primary` (rose `#d70f58`) — see the accent rule below |
| Status | `success` · `warning` · `destructive`, each with a `-tint` background for pills |
| Charts | `chart-1` (rose) primary series · `chart-2` (grey) comparison · `chart-3` amber (cleaning) · `chart-4`/`chart-5` greys |

**The accent rule.** Rose appears only on: the primary button, the active nav/tab indicator, focus
rings, links, selected pills and chart series 1. **Never** on icons, icon tiles, decorative
backgrounds, card borders, headings or selected controls (checkboxes, choice cards and segmented
controls use `foreground`). Status colours are small text or pills only. No glows, multicolour
metric cards or tinted panels. Gradients only in the sanctioned places below.

**Colour on flat pages.** Photos stay on the hubs (Today, guest Home); everything else gets colour
from a small, fixed set of surfaces:

- **Key cards**: the plum stay key card, the wallet of in-house keys and the floor board (staff);
  the teal guest keycard you can turn over (guest Home). The card form belongs to these; don't
  reuse it as a page header.
- **Teal band** (`BandScreen` native, `BandHeader` web): the title of a flat guest page (Profile,
  Privacy) on the teal gradient, with one summary line inside it.
- **Solid colour icons** on facts (`FactRow` / `FactList`): a white glyph on a solid square, one
  colour per kind of fact (`factTones` in `@tattvix/api`). Never a pale tint of the icon's own hue.
- **Place marks** (`PlaceMark`): a place's initials on its own gradient (`placeTone`), the same in
  the switcher and on Privacy; Personal is teal.

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
| KPI label / value | 14px `muted-foreground` / 28px / 600 — no icon |

Sentence case everywhere. No uppercase eyebrows.

## Layout and spacing

- Content max width ~1400px. Page padding 32px (16px on mobile).
- 24px between panels, 20–24px inside panels, 12–16px inside related groups.
- Lists: 44px rows; bill/ledger: 52px rows. Table header `bg-muted`, 12px labels.
- Mobile collapses to one column; side panels move below the main column.
- Tables use `ResponsiveTable`: a grid table when its container is wide enough, a divided list of
  `ListRow`s when it isn't (a container query, so it also adapts inside a narrow column). Pick
  `switchAt` as the smallest size where every column fits. Never ship a table that scrolls sideways
  on a phone.
- Filters above a list go in a `FilterBar`: full-width stacked controls on a phone.
- Groups of cards that would stack into a long column on a phone go in a `Rail` (`@tattvix/ui`):
  a scroll-snap row that bleeds to the screen edge, switching to a grid at `md`.
- Pick-one filters with counts ("Arriving (3)") use `PillTabs` (`@tattvix/ui`): a tablist of
  rounded pills that scrolls sideways instead of wrapping.

## App shell

Every signed-in workspace (personal, hotel staff, platform admin) uses `AppShell`
(`apps/web/src/components/app-shell.tsx`). There is no sidebar.

- **`md` and up:** sticky top nav. `BrandLogo` on the left, the workspace's section links in the
  centre (on their own row below `lg`), and **one account pill** on the right. The active link is
  foreground text plus a 3px rose underline, one element that slides between links.
- **Account pill and panel** (`components/place-switcher.tsx`, ADR 0003 addendum): the one
  control for where you are and who you are, shown to every signed-in user.
  - **Pill:** the current place's picture and short name, then the person's avatar. Personal
    shows the avatar once.
  - **Panel:** it opens from the pill (growing from its top-right corner) or with ⌘K / Ctrl+K
    (not inside text inputs). It holds:
    - the person (name, email);
    - **Switch to**: Personal and Platform, then Recent (7+ hotels), then hotels grouped by
      organization, with search at 7+ hotels;
    - Manage properties (inside a hotel), Account settings and Sign out.

    ↑↓/↵ move and open. There is no separate avatar menu.
  - **Rows:** each row is a real link to the place's home: Today, the org setup, My stays or
    Hotels.
  - **Pictures:** covers are real property photos with an initials fallback. Platform is a bare
    neutral shield, and Personal is the person's avatar.
  - **After a switch:** a 200ms fade-rise of the content and a short "Place · Home" cue.
  - **Always visible**, guest-only accounts included: their list is Personal (current), then a
    "List your hotel" row ("Run a hotel? Set it up on Tattwix", to `/register-hotel`). The same
    row ends the list for anyone with no hotel and no platform access. A pending hotel request
    (when already in the query cache) shows as "Hotel request pending" instead.
- **Phones:** a `BottomTabBar`.
  - The first tab is the current place (its picture). It opens the same account panel as a
    `BottomSheet`, and it lights up on account pages.
  - Up to three everyday pages follow, then **Menu**, which holds only the pages without a tab
    (no account controls). Menu is omitted when there are none.
  - There is no phone top bar, except without any tab (a hotel with no property yet), when a top
    bar carries the logo and the same account pill.
- **Model, not markup:** these are pure, tested functions, and the shell only renders them.
  - `lib/workspace-navigation.ts` (`getHotelNavItems`, `getPersonalNavItems`,
    `getPlatformNavItems`, `split*NavForTabBar`) sets the pages per workspace and the tab split.
  - `lib/workspace-switcher.ts` (`getSwitchPlaces`, `buildSwitcherSections`,
    `filterRecentPlaces`) sets which places a user may open and how the list is built. Permission
    gating lives there.
- Main content leaves room for the tab bar and the safe areas (`--tab-bar-height`,
  `env(safe-area-inset-*)`). Toasts lift above the tab bar automatically (`--toast-clearance`).
- Do not add another fixed bottom element on phones; put actions in the page or a sheet.

## Brand

The mark is **Threshold**: an open, offset doorway in near-black `#222222`, never in the accent.
`BrandLogo` and `BrandMark` (`apps/web/src/components/brand.tsx`) are the only React source of the
logo; every shell, login, sign-up and check-in screen uses them, drawn in `currentColor`. These
non-React copies must stay in sync with its paths:

1. `apps/web/public/favicon.svg` (32-unit version; flips to white in dark browser chrome) and `favicon.ico` (32px, for browsers that only ask for `/favicon.ico`). Both are linked statically in `index.html`.
2. `apps/web/public/apple-touch-icon.png` (180px, white background).
3. The boot splash mark in `apps/web/index.html`, which paints before React loads.
4. `apps/native/assets/images/brand-mark.svg` and the native `BrandMark`. Regenerate Expo
   launcher, adaptive/themed, splash and favicon PNGs with `bash scripts/generate-native-brand.sh`
   (ImageMagick 7). Android layers use a 1024px canvas with the mark inside the adaptive safe
   circle; the launcher background is opaque white. Launcher changes require a new native build.

## Page anatomy

1. **Header row:** title (+ meta) on the left, at most one primary action on the right. No eyebrow, no description paragraph. The one exception is a **photo hero** on hubs (`PhotoHero`): hotel Today over the hotel's own cover (date above the property name), and guest Home over a travel photo. A hotel without a cover gets the plain `LargeTitle`; never a stand-in photo.
2. **Optional `KpiStrip`:** one bordered container with vertical dividers — not separate cards.
3. **Work area.** Detail screens use **main + side** (~64/36): the task (bill, table, form) in main; context (guest, companions, identity, activity) in a single side `Panel` with divided sections.

## Density over austerity

Screens should feel full and alive at real data volumes (see `docs/design/reference/overview.jpg`):
avatars on people, KPI strips above lists, status pills,
charts where there is a trend, imagery where real photos exist, and a short orienting line where
a newcomer would wonder what an area is for. The rules below remove **noise** (boxes in boxes,
repeated facts, internals copy, accent tints) — never **information**. Judge a screen with seeded
data (`pnpm seed -- --email <you>`), not an empty dev database.

## Composition rules

1. **One fact, one place.** Room, rate, dates or status shown in the header don't repeat below.
2. **One primary action per page.** Secondary actions sit where they apply ("Add charge" on the bill).
3. **Rare content collapses** behind a link ("View images").
4. **Row actions appear on hover/focus**, never permanently on every row — on mouse devices only (`rowActionsRevealClassName`); touch screens always show them.
5. **Dashboards show data.** No tiles that only link elsewhere.
6. **Facts rows are plain text** (label over value), not bordered cells.

## Components and interactions

- Buttons: `default` (rose) for the one primary; `outline` for secondary; `ghost` for tertiary (Print).
- Inputs: visible labels; placeholder is an example, not the label. Selects must render the selected option's **label**, never its raw value.
- Remote-record selection uses a shadcn Combobox with loading, empty and error states.
- Focused tasks started from a card (assign a room, check out, change room status) open in a
  `BottomSheet` (`@tattvix/ui`): a drag-to-dismiss sheet on phones, a centred dialog from 768px.
  One primary action in its footer. Use `Dialog` only for confirmations.
- Pressable cards use the `press` class (scale 0.97 while pressed). See "Motion" below.
- Whole rows/cards that navigate are the link — not just a small arrow inside them.
- Empty states: a bare muted line icon (no tile), what belongs here, one useful next action.
- Navigation: top nav active item = foreground text + sliding rose underline; tab bar active item
  = foreground icon and label with a short rose tick above it. Inactive items quiet.
- Icons: Lucide, 16px, stroke 1.75, `muted-foreground` (or `foreground` on an active item). No
  background square or circle behind an icon, ever, and never in the accent colour.

## Motion

Crisp and minimal: motion is feedback or orientation, never decoration. Tokens in `globals.css`:

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | entering and leaving (also the `ease-out` utility) |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | an indicator moving on screen |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | phone bottom sheet |
| `--duration-press` | 140ms | `press` scale-down |
| `--duration-enter` / `--duration-exit` | 200ms / 140ms | dialogs, centred sheets, first-load rise |
| `--duration-move` | 220ms | nav underline, tab tick, pill indicator |
| `--duration-sheet` / `--duration-sheet-exit` | 240ms / 180ms | phone bottom sheet, backdrop, toasts |
| `--stagger-step` | 40ms | between KPI cells and cards |

- Only these move: press feedback (scale 0.97); sheets, menus, selects and toasts (ease-out
  entrance, faster exit, popovers scale from their trigger); the nav, tab and pill indicators;
  a once-per-visit fade-and-rise of KPI cells and cards (`enter-up`, settled by
  `lib/entrance-motion.ts`); and a place switch, which plays one `place-swap` fade-rise of the
  content and the `place-cue` pill (in 200ms, out after 1.4s).
- `transform` and `opacity` only (`clip-path` for the pill indicator). Nothing animates layout.
- No motion on keyboard-driven changes (arrow keys in pill tabs jump), route changes or anything
  done many times a minute. Name exact properties; never `transition: all`.
- `prefers-reduced-motion`: movement is removed; short opacity fades remain.

## Imagery

- **Hotel imagery is real data only:** property cover and room-type photos uploaded in Property
  settings. Where a layout is built around a photo (room tiles on Today, room choices in a sheet),
  a missing photo shows a quiet `muted` block (large slots may say "No photo yet"; no icon) so the
  grid stays even; elsewhere omit the slot.
- **Photos lead only the two hubs:** hotel Today (the hotel's own cover) and guest Home (a decorative
  travel photo), plus the check-in welcome and sign-in. Every other page uses a plain text header;
  no cover strips or decorative photos on Stays, Profile, Privacy, Companions or settings. Sources live in
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
- Accent only where the accent rule allows; icons neutral except fact icons (solid squares) and place marks; never a same-hue tinted tile.
- Motion uses the tokens, has a purpose, and handles reduced motion.
- No hero header outside the hub `PhotoHero`, no eyebrow, no box in a box, each fact once, one primary action.
- Numbers tabular; selects show labels; clickable rows are fully clickable.
- Loading, empty, error, disabled and narrow-screen states covered.
- No implementation/debug detail in user-facing copy.

## Native application

The native app (Tattwix, Android-first) serves hotel staff and guests with the same visual
language as the web. Its contract is `apps/native/docs/design-system.md`; components live in
`apps/native/src/design-system`. Every feature, copy or behaviour change lands in both apps.
