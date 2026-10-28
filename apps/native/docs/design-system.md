# Tattwix Native Design System

The implementation contract for `apps/native`. It mirrors the web's visual language
(`docs/design-system.md`, ADR 0003) but is a **separate, hand-synced copy**: values below are
copied from `packages/ui/src/styles/globals.css` on 2026-10-25. When the web changes a token,
update this file and `src/design-system/theme.ts`; there is no automatic sync.

Reference screens: `docs/design/reference/native-prototype.html` (open in a browser; keys 0–6
switch screens). Decisions: GitHub issues #46 (stack), #51 (tab bar), #52 (desk QR).

## Product character

A calm, precise front-desk tool that also serves guests. White canvas, warm-neutral greys, one
rose accent used sparingly, real photos where real data has them. **Light theme only**; the app
forces `userInterfaceStyle: light` and never branches on the device scheme.

## Stack

- `StyleSheet` for styling. No NativeWind, no styled-components, no inline style objects created
  per render in hot lists.
- `react-native-reanimated` for motion, `react-native-gesture-handler` for sheets and swipes.
- `lucide-react-native` line icons, `react-native-svg` for the brand mark.
- Pickers (date, country) are JS bottom sheets built from these primitives. Expo UI
  (`@expo/ui`) is not installed; adding it, or any native module, needs a new store build, so
  prefer JS-only components that can ship over the air.
- Fonts: Inter (variable) via `expo-font`, weights 400 / 500 / 600 / 700.

## Colour (`theme.ts` → `colors`)

| Role | Token | Value |
|---|---|---|
| Canvas, cards | `background`, `card` | `#ffffff` |
| Text | `foreground` | `#222222` |
| Secondary text | `mutedForeground` | `#6a6a6a` |
| Labels, meta | `subtleForeground` | `#717171` |
| Lines around cards and controls | `border` | `#dddddd` |
| Dividers inside a card | `borderSoft` | `#ebebeb` |
| Neutral fills (pill, avatar bg, table header) | `muted` | `#f7f7f7` |
| Text-input outline | `input` | `#929292` |
| Accent | `primary` / `primaryHover` | `#d70f58` / `#b00c49` |
| On accent | `primaryForeground` | `#ffffff` |
| Status | `success` / `successTint` | `#067647` / `#ecfdf3` |
| | `warning` / `warningTint` | `#b54708` / `#fef4e6` |
| | `destructive` / `destructiveTint` | `#b42318` / `#feeceb` |
| Scrim behind sheets | `scrim` | `rgba(0,0,0,0.35)` |

**The accent rule.** Rose appears only on: the primary `Button`, the active tab tick, focus rings,
links, selected pills and the first chart series. **Never** on icons, icon backgrounds, decorative
fills, card borders, headings or selected controls (checkbox / segmented / choice use
`foreground`). Status colours are small text or pills only. No gradients except the photo scrim,
no glows, no tinted panels.

**No tinted icon tiles.** Icons are bare neutral line icons with nothing behind them. The only
circles are avatars (`InitialsAvatar`, photo avatars).

## Shape and elevation (`theme.ts` → `radii`, `shadows`)

| Element | Radius |
|---|---|
| Cards, panels, sheets' top corners | 16 (`radii.card`); sheets 20 |
| Buttons, inputs | 10 (`radii.control`) |
| Photo tiles, list pictures | 12 (`radii.photo`) |
| Pills, pill tabs, badges | 999 (`radii.pill`) |

Cards: 1px `border` **plus** `shadows.card` = `{ shadowColor:'#000', shadowOpacity:0.06,
shadowRadius:12, shadowOffset:{0,6}, elevation:2 }`. Sheets and menus: `shadows.raised` =
`{ shadowOpacity:0.12, shadowRadius:24, shadowOffset:{0,12}, elevation:8 }`. No other shadows.
**No box in a box**: sections inside a card are separated by `borderSoft` hairlines, never nested
cards.

## Typography (`theme.ts` → `type`)

Inter, `fontVariant: ['tabular-nums']` on every number, money value and KPI. Sentence case
everywhere; **no uppercase eyebrows**.

| Style | Size / line / weight | Tracking | Use |
|---|---|---|---|
| `hero` | 34 / 38 / 700 | −1 | Sign-in headline only |
| `largeTitle` | 30 / 34 / 700 | −0.6 | Hub pages (Today, Guest home) |
| `pageTitle` | 24 / 28 / 700 | −0.5 | Detail pages |
| `sectionTitle` | 22 / 26 / 600 | −0.3 | Sections on hub pages |
| `cardTitle` | 18 / 22 / 600 | −0.2 | Sheet titles, panel titles |
| `rowTitle` | 15 / 20 / 500 | 0 | List rows, names |
| `body` | 15 / 22 / 400 | 0 | Paragraphs |
| `meta` | 14 / 20 / 400 | 0 | Meta lines under titles (`mutedForeground`) |
| `caption` | 13 / 18 / 400 | 0 | Row detail, footers (`mutedForeground`) |
| `label` | 12 / 16 / 500 | 0 | Labels above values, group headers (`subtleForeground`) |
| `kpiValue` | 26 / 30 / 600 | −0.5 | Numbers in `Kpi` |
| `button` | 15 / 20 / 600 | 0 | |
| `tab` | 11 / 14 / 500→600 | 0 | Tab bar labels (600 when active) |

## Spacing (`theme.ts` → `space`)

4-point scale: `xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 24 · xxxl 36`. Screen gutter 20.
Between sections 36. Inside a card 16. Rails bleed to the screen edge (negative gutter) with a
20 inset and 12 gap. List rows are at least 56 tall, 44 for compact menu rows.

## Primitives (`src/design-system/`)

Build with these; add a primitive only when none can express the interaction. No screen-local
buttons, cards, inputs, sheets, pills or empty states.

| Primitive | Role | Notes |
|---|---|---|
| `Screen` | Safe-area aware scroll container with the 20 gutter and tab-bar clearance | `scroll` or `fixed` |
| `HeroScreen` + `HeroAction` | Photo-led hub screen (hotel Today on the hotel's cover, guest Home and guest tab pages on travel photos): title on a scrim, white sheet overlapping by 24, photo parallax at half speed, compact solid title bar and dark status bar once scrolled past | `size` `hub` 260 / `page` 196; no photo or a failed load falls back to `Screen` + `LargeTitle`; never a stand-in photo for a hotel. `HeroAction` is the white chip pinned top-right |
| `Enter` | Staggered entrance for sections: fade + 10 up, 320ms `easeOut`, 40ms per `index` | reduced motion: 200ms fade only |
| `LargeTitle` / `PageTitle` / `SectionTitle` | Title + optional meta line + optional trailing `action` (text link) | |
| `Button` | `primary` (rose) · `outline` (1px foreground border) · `ghost` (muted fill) · `destructive` text | sizes `md` 44 / `sm` 38; `loading` swaps label for a spinner; press scales to 0.97 |
| `TextField` | Labelled input, 50 tall, `input` outline, focus ring = 2px `primary` at 55% | label above, helper/error below |
| `Card` | White, border, `shadows.card`, radius 16, padding 16 | |
| `Panel` + `PanelRow` | A `Card` with zero padding whose children are rows divided by `borderSoft` | rows: optional leading icon / avatar, title, detail, trailing (`chevron`, badge, value) |
| `ListRow` | The row used inside `Panel` and in plain lists | whole row is pressable when `onPress` is given |
| `FactRow` | Read-only fact inside a `Panel`: 14 muted label over the 16 value; null reads "Not added" | read views with an "Edit" link that opens a sheet (guest Profile) |
| `StatusPill` | `neutral` · `success` · `warning` · `destructive`; 12/600 text on the `*Tint` fill | `onPhoto`: solid white chip for a badge over a photo |
| `PillTabs` | Horizontal, scrolling, pick-one tabs with counts; selected = `foreground` fill, white text | the fill slides between pills (220ms `easeInOut`); reduced motion jumps |
| `Rail` | Horizontal scroll row bleeding to the edge, snap to item, `auto-cols` as a percentage prop | |
| `Kpi` | Label (14 muted) over value (26/600) inside a `Card` | never with an icon |
| `InitialsAvatar` | Circle, `muted` fill, 600 initials; sizes 40 / 44 | |
| `PhotoTile` | Photo (`expo-image`, cached, 200ms fade) with a bottom scrim and a white label; muted placeholder block when no photo | `aspectRatio` (4:3 default), `radius`, top-left `badge`, `emptyText` for "No photo yet" |
| `EmptyState` | Bare muted line icon, one line of what belongs here, one `Button` | |
| `BottomSheet` | Drag-to-dismiss sheet: grab handle, 20 top radius, `shadows.raised`, scrim; enters 240ms `easeDrawer`, exits 180ms | one primary action in its footer |
| `ConfirmSheet` | A `BottomSheet` with title, one line, primary/destructive + cancel | used for charge void, sign out |
| `TabBar` | Custom tab bar for expo-router `Tabs`: 5 items, neutral icons (stroke 1.6, 2.1 active), label 11, a 32×3 rose tick sliding along the top edge (220ms `easeInOut`) | no Material ripple colour; pads above the home indicator |
| `BrandMark` / `BrandLogo` | The Threshold mark (`react-native-svg`, paths identical to the web) + "Tattwix" 700 −0.03em | sizes sm 18 / md 22 / lg 30 |
| `Splash` | Animated lockup played once after the static splash hides (see Motion) | |

## Motion (`theme.ts` → `motion`)

Crisp and minimal: feedback or orientation, never decoration. Every animation checks
`useReducedMotion()` and collapses to an opacity change.

| Token | Value | Use |
|---|---|---|
| `easeOut` | `Easing.bezier(0.23, 1, 0.32, 1)` | entering and leaving |
| `easeInOut` | `Easing.bezier(0.77, 0, 0.175, 1)` | an indicator moving on screen |
| `easeDrawer` | `Easing.bezier(0.32, 0.72, 0, 1)` | bottom sheet |
| `press` 140 | scale to 0.97 while pressed | every `Button`, pressable card and row |
| `enter` 200 / `exit` 140 | dialogs, first-load rise of cards (8px up + fade, stagger 40) | |
| `move` 220 | tab tick, pill indicator | |
| `sheet` 240 / `sheetExit` 180 | bottom sheet and scrim | |

Only `transform` and `opacity` animate; everything runs on the UI thread via Reanimated. Nothing
animates on a keyboard-driven change.

**Splash.** `expo-splash-screen` shows the static white screen with the mark centred. The
`Splash` component then plays, over the same white, in this order: the door frame fades up from
0.92 scale and 6px below (520ms `easeOut`); the inner leaf slides in from 26px right (460ms
`easeOut`, starts at 260ms); "Tattwix" slides in from 10px left beside the mark (420ms, starts at
560ms); the lockup settles to 0.94 scale (500ms, starts at 1000ms) while a 13px
`subtleForeground` "Arrive ready." fades in (starts at 1100ms). Total ≈1.5s, then it fades out
over the first screen in 200ms. Reduced motion: everything appears at once and fades out.

## Navigation chrome

- Hotel mode tabs: Today · Stays · Rooms · Guests · Menu. Guest mode tabs: Home · Stays · Profile
  · Privacy · Menu. Menu opens the place switcher sheet (you, your hotels with cover photos,
  Personal, account settings, sign out).
- Secondary screens: a 48-tall header with a round back target (40) on the left and a centred
  17/600 title. No large title on secondary screens.
- No phone top bar on tab roots; the large title does that job.
- Focused tasks started from a card (assign a room, check out, change room status) open in a
  `BottomSheet`. Confirmations use `ConfirmSheet`. Never a system `Alert` for product flows.

## Composition rules (same as web)

1. One fact, one place. 2. One primary action per screen. 3. Rare content collapses behind a
link. 4. Whole rows and cards that navigate are the pressable, not a small arrow. 5. Empty states:
bare muted icon, what belongs here, one action. 6. Judge every screen with seeded data.
