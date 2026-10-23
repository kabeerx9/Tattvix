# 0003 — Host shell, rose accent and accent restraint

Date: 2026-10-23 · Status: accepted · Scope: web app, every signed-in workspace

Supersedes the palette in 0001 (deep teal) and the hotel-only shell in 0002. 0002's card radius,
shadows, title sizes, Today page and shared primitives stay.

## Context

Users found the sidebar small and the teal-green theme unpleasant. Three directions for the whole
app frame (nav, palette, dashboard) were prototyped in PR #33: Host (Airbnb-host top nav, rose),
Ledger (wide light sidebar, indigo) and Concierge (floating ink sidebar, plum). Feedback on that
round was that putting the accent on icons and same-hue icon-on-tint tiles looked cheap. PR #34
reworked the directions so the accent stays restrained. **Host** was chosen.

## Decision

- **Palette (`packages/ui/src/styles/globals.css`).** White canvas, warm-neutral greys
  (foreground `#222222`, muted `#6a6a6a`, subtle `#717171`, border `#dddddd`), one rose accent
  `#d70f58` (hover `#b00c49`). `--subtle-foreground` moves from `#8a94a3` (3.1:1, failed AA) to
  `#717171` (4.8:1). `--primary-tint` is neutral grey. Chart series 1 is the accent; series 2,
  4 and 5 are greys, and series 3 is amber for "cleaning". Status colours (success `#067647`,
  warning, destructive) are unchanged in role.
- **Accent restraint.** The accent appears only on the primary button, the active nav/tab
  indicator, focus rings, links, selected pills and chart series 1. Never on icons, icon tiles,
  decorative backgrounds, card borders or headings. Selected controls (checkboxes, choice cards,
  segmented controls) use the foreground colour.
- **No tinted icon tiles.** Icons are neutral line icons with no square behind them. KPIs are a
  label and a number. Empty states show a bare muted icon. Missing photos are a quiet muted block
  with an optional short label.
- **One shell for every workspace (`apps/web/src/components/app-shell.tsx`).** Personal, hotel
  staff and platform admin all get the same layout. From 768px it has a sticky top nav: the
  wordmark on the left, section links in the centre with a sliding accent underline, and a
  workspace pill on the right. The pill holds the hotel/property switcher, the workspace switcher,
  account settings and sign out. On phones there is a bottom tab bar (neutral icons, accent tick)
  with a Menu tab that opens a sheet. The pages per workspace, which pages become tabs and which
  workspaces a user may switch to are pure functions in `lib/workspace-navigation.ts`, with tests.
  The sidebar shell and the shadcn sidebar primitive are removed.
- **Logo.** A single `BrandLogo` component (`apps/web/src/components/brand.tsx`) renders the logo
  everywhere in React: a plain near-black wordmark placeholder until the real logo lands. The
  favicon and the boot splash (`index.html`) are the only other copies.
- **Motion tokens.** The curves `--ease-out` and `--ease-in-out` (which also back the Tailwind
  `ease-out`/`ease-in-out` utilities) and `--ease-drawer`. The durations are `--duration-press`,
  `-enter`, `-exit`, `-move`, `-sheet` and `-sheet-exit`, plus `--stagger-step`. UI motion stays
  under 250ms, exits are faster than entrances, and only `transform` and `opacity` animate (plus
  `clip-path` for the pill indicator). Every animation handles `prefers-reduced-motion`. Only
  these animate:
  - press feedback;
  - sheet, menu and toast entrance and exit;
  - the moving nav, tab-bar and pill indicators (no motion on keyboard changes);
  - a once-per-visit rise of KPI cells and cards.

## Consequences

- Teal is gone from every surface. Accent tints are gone, and the light/dark split of the old
  sidebar tokens goes with the sidebar.
- The personal workspace's top nav carries six links at 768px. A seventh personal page needs a
  shorter label or a move to the account menu.
- Adding a fifth everyday destination to any workspace still means revisiting its tab split.
- Swapping in the real logo touches three places: `brand.tsx`, `public/favicon.svg` and the
  splash in `index.html`.
