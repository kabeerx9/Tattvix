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

## Addendum (2026-10-23): place switcher

Hotel owners with several properties, and owners who also travel, needed switching to be
obvious. Three models were prototyped in PR #37 (an Airbnb-style hosting/travelling toggle, a
context pill, and Stay · Host · Admin modes). **Context pill** was chosen, and it replaces the
workspace pill and the switchers in the account menu and the Menu sheet.

- **One control, one list.** A *place* is Personal, Platform admin, one hotel property, or an
  organization that has no property yet. From 768px the current place sits at the far left as
  a pill (cover photo or initials, name, organization or role). It opens one searchable list:
  - Personal and Platform first;
  - then Recent;
  - then hotels grouped by organization.

  ↑↓ move, ↵ opens, and ⌘K / Ctrl+K opens the list from anywhere except while typing. On phones
  the first tab is the current place and opens the same list as a sheet. The top bar (it scrolls
  with the page) also shows the place. The switcher is **always visible** to signed-in users,
  guest-only accounts included, because the guest-to-host moment is where it matters most. A
  guest's list is Personal, then a "List your hotel" row (to `/register-hotel`). That row also
  ends the list for anyone without hotels or platform access, and reads "Hotel request pending"
  when a pending request is already in the query cache. The avatar menu holds only account
  settings and sign out.
- **Model, not markup.** `lib/workspace-switcher.ts` builds the places from `/me`:
  - a hotel needs `hotel:view` on its membership;
  - Platform needs `platform:admin`;
  - each place's home is fixed: a property opens Today, an organization with no property opens
    its setup page, Personal opens My stays, and Platform opens Hotels.

  Listing a place never grants access, and the routes still enforce permissions. Tests cover the
  grouping, ordering, search, Recent filtering, the guest-only and admin cases, and the homes.
  This supersedes `getWorkspaceOptions` and `getHotelSwitchOptions`.
- **Recent** holds up to four place keys (`property:<id>`, ids only) per user id in
  localStorage, with every access wrapped in try/catch. It is re-filtered against the current
  memberships every time it is shown, so a revoked hotel disappears. It shows only once a list
  is long enough to search (7+ hotels), never while searching, and never includes the current
  place.
- **Motion.** After a switch the content fades and rises (200ms) and a "Place · Home" cue shows
  for 1.4s. Reduced motion gets an opacity-only fade.

Consequences: with a place pill, the section links take a second header row between 768 and
1023px. On phones the place tab replaces one section tab, so Guests (hotel) and Companions
(personal) move into Menu. Hotel covers in the list come from one photo request per property
while the list is open. Putting covers in `/me` would remove that request fan-out.

Revision (same day): the switcher was first hidden for guest-only accounts, which left a quiet
"List your hotel" link as their only way in. In testing that read as a missing switcher, so it
is now always shown and the link lives in the list.

