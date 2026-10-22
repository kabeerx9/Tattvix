# 0002 — Airbnb-style hotel staff shell and card tokens

Date: 2026-10-22 · Status: accepted · Scope: web app, hotel staff routes

## Context

Hotel staff work the front desk from phones and tablets as much as from desktops. The sidebar
shell from 0001 hides navigation behind a menu button on phones, and the overview page was a grid
of charts that answered "how did we do" rather than "who needs me now". Three prototypes of an
Airbnb-host-style dashboard (Today, Rooms, Insights) were compared in PR #26; **Today** was chosen.

## Decision

- Hotel staff routes use a dedicated `HotelShell`: a sticky top nav with centred links from 768px,
  and a bottom tab bar (Today, Stays, Rooms, Guests, Menu) on phones. Menu is a bottom sheet with
  the remaining destinations, the org/property switcher and account links. Personal and
  platform-admin workspaces keep the sidebar shell.
- The hotel overview becomes **Today**: reservation pill tabs with counts, guest cards with one
  action each (assign room, check out), a ready-rooms rail, housekeeping and tonight's occupancy.
  Actions open bottom sheets backed by the existing check-in, checkout and room-status APIs.
- Design tokens change for all web surfaces: cards and panels move from 8px to 16px radius
  (`--card-radius` / `rounded-card`), gain a soft two-layer shadow (`--elevation-card` /
  `shadow-card`, plus `shadow-raised` for floating surfaces), and titles get larger (page title
  24/28px bold; new 30/34px `LargeTitle` and 22px `SectionTitle`).
- New shared primitives: `BottomSheet`, `PillTabs`, `Rail` in `@tattvix/ui`; `LargeTitle`,
  `SectionTitle`, `BottomTabBar` in `design-system.tsx`.
- Deep teal stays the only accent; no coral, no dark mode.

## Consequences

- Every page using `Panel`/`KpiStrip` picks up the new radius and shadow; nested 8px controls
  inside 16px cards are intentional.
- The old overview charts (occupancy trend, movement, room status) are removed; trend analysis
  lives in Reports.
- Toasts are offset by `--toast-clearance` so they sit above the tab bar on phones.
- Room tiles show a muted placeholder when a room type has no photo, relaxing 0001's
  "omit the slot" rule for photo-led layouts only.
- The tab bar caps phone navigation at four destinations plus Menu; adding a fifth primary
  destination means revisiting `splitHotelNavForTabBar`.
