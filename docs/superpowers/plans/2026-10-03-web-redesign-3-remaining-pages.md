# Web Redesign — Plan 3: Remaining Pages & Legacy Removal

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port every remaining web page to the A3.1 grammar, fix bugs B1 and B2, then delete the legacy primitives (`Surface`, `MetricCard`, `.app-kicker`) and the frozen design reference.

**Density over austerity (revised 2026-10-03 after review):** pages must feel as full as `docs/design/reference/overview.jpg` — avatars, neutral category tiles, KPI strips, status pills, short orienting lines. Remove *noise* (boxes in boxes, repeated facts, internals copy, teal tints), never *information*. When in doubt, keep the content and restyle it.

**Architecture:** Mechanical migration onto the primitives built in Plans 1–2 (`PageHeader`, `Panel`/`PanelHeader`/`PanelSection`, `KpiStrip`/`Kpi`, `FactsRow`/`Fact`, `StatusPill`, `EmptyState`, `ConfirmDialog` in `apps/web/src/components/design-system.tsx`). Layout and styling only — no data, query, mutation or permission changes.

**Tech Stack:** React 19, TanStack Router/Query, Tailwind v4, shadcn (`base-lyra`, Base UI).

**Spec:** `docs/superpowers/specs/2026-10-03-web-visual-redesign-design.md` §6, §8, §11 steps 6–10. Contract: `docs/design-system.md`. Finished examples to copy from: `features/hotel-overview/components/hotel-overview-page.tsx`, `features/hotel-stays/components/hotel-stay-detail-page.tsx`, `features/hotel-stays/components/stay-bill-panel.tsx`.

**Plan 3 of 4.** Plans 1–2 are done.

## Global Constraints

- Light only; semantic tokens only; no `dark:` variants; no hex/raw palette classes.
- Teal is rare (primary button, links, success pill, KPI tile). No tinted icon tiles except `Kpi`.
- One primary action per page; one fact, one place; no box in a box.
- **Do not change** any `useQuery`/`useQueries`/`useSuspenseQuery`/`useMutation` call, `.mutate(` arguments, route loaders, permission checks, form validation, or `api.ts`/`queries.ts`/`mutations.ts` files. Identity-image and consent flows are danger domains: layout only.
- Keep `stay-print-*` classes wherever they exist.
- **Never commit.** Leave changes unstaged.
- Commands (no pnpm in sandboxed agents): tests `cd apps/web && node --import tsx --test 'src/**/*.test.ts'` (52 passing); types `cd apps/web && ./node_modules/.bin/vite build && ./node_modules/.bin/tsc --noEmit`.

## Migration rules (apply to every file in Tasks 1–4)

| # | Old pattern | New pattern |
|---|---|---|
| R1 | `<Surface …>` card with a heading | `<Panel>` + `<PanelHeader title icon? meta? actions?>` + content in `<PanelSection>` |
| R2 | Surface / `bg-muted/60` box nested inside another card | a `<PanelSection>` of the parent panel (divider, no inner box) |
| R3 | `app-kicker` eyebrow | delete; if it was the only label, `text-xs text-subtle-foreground` sentence case |
| R4 | Icon in a tinted 40–48px tile next to a **panel heading** | pass the icon to `PanelHeader icon` (16px grey). **But** rows that represent a destination or category (nav entries, document types, report types) keep a **neutral** tile: `grid size-9 place-items-center rounded-md bg-muted text-muted-foreground` with an 18px icon. Never teal tiles outside `Kpi`. |
| R5 | `rounded-xl` / `rounded-2xl` | `rounded-lg` |
| R6 | Heading + explanatory paragraph | keep the heading; **keep one short orienting line** (12–13px `text-subtle-foreground`) when it helps the user know what this area is for — especially on guest-facing personal pages. Delete only multi-sentence explainers and internals (R10). |
| R7 | Ad-hoc pill (`rounded-full px-2… bg-…`) for a status | `<StatusPill tone>`: success = active/approved/ready/checked-in; warning = pending/waiting/due; danger = rejected/revoked/void/error; neutral = closed/inactive/checked-out |
| R8 | List of cards, one per record | one `Panel` with rows: `h-11`/`min-h-11 px-5 border-t border-border-soft first:border-t-0`, whole row is the `Link` when it navigates, `hover:bg-muted/50` |
| R9 | Table | header row `bg-muted text-xs text-subtle-foreground`, numbers right-aligned `tabular-nums` |
| R10 | Copy explaining auth/audit/storage internals | delete |
| R11 | Page wrapper | hotel/admin: `mx-auto grid max-w-[1400px] gap-6`; personal: `mx-auto grid max-w-5xl gap-6` |
| R12 | Empty state hand-rolled | `<EmptyState icon title description action?>` |
| R13 | Person in a list/table | initials avatar before the name: `grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold` (use `getInitials` from `@/lib/initials`) |
| R14 | List page with countable states | a `KpiStrip` of 3–4 `Kpi`s above the list (e.g. Stays: Waiting · In house · Checked out today; Rooms: Vacant · Occupied · Cleaning · Maintenance; Guests: In house · This week). Counts come from data the page already loads. |

Per-task acceptance (run after each task, from repo root; expected output: nothing):
```bash
grep -nE "<Surface|app-kicker|MetricCard|rounded-(xl|2xl)|bg-accent text-|bg-muted/60" <the task's files>
```

## Review Focus

1. **Stays filter shows "All statuses", never `__all__`** (B1) — Task 1.
2. **My hotels: clicking anywhere on a hotel row opens it** (B2) — Task 1.
3. **Guest consent flow still submits and revokes** (check-in page, privacy center) — Task 4 / Task 2: layout only; reviewer re-runs a check-in.
4. **Identity document upload/camera capture still works** (`identity-documents-section`, `document-image-field`) — Task 2: layout only.
5. **Oversight status filter shows a label, not `__all__`** (B1 second site) — Task 3.

---

### Task 1: Hotel workspace pages (+ B1, B2)

**Files:** `features/hotel-stays/components/hotel-stays-page.tsx`, `features/hotel-operations/components/hotel-rooms-page.tsx`, `features/hotel-operations/components/hotel-guests-page.tsx`, `features/hotel-reports/components/hotel-reports-page.tsx`, `features/hotel-details/components/hotel-details-page.tsx`, `routes/_auth/_hotel/hotel/index.tsx`, `routes/_auth/_hotel/hotel/$organizationSlug/index.tsx` (all under `apps/web/src/`).

- [ ] **Step 1: B1 — select shows its label.** In `hotel-stays-page.tsx`, the Base UI `Select` (it is `SelectPrimitive.Root`) accepts an `items` prop mapping values to labels. Pass the existing options:
  ```tsx
  <Select items={STATUS_FILTERS} value={statusFilter} onValueChange={…unchanged…}>
  ```
  (`STATUS_FILTERS` is already `{ value, label }[]`.) If the type-checker rejects the array form, pass `Object.fromEntries(STATUS_FILTERS.map((o) => [o.value, o.label]))`.
- [ ] **Step 2: Stays page.** QR generator becomes `PageHeader actions` (already) + the QR result as a `Panel` (QR left, URL + Copy + expiry right, no kicker). "Submitted check-ins" → one `Panel` with `PanelHeader title="Check-ins" meta={count}` and the filters in a `PanelSection`; rows per R8 with `StatusPill` (PENDING_CHECK_IN warning "Waiting for a room", CHECKED_IN success "Checked in", CHECKED_OUT neutral "Checked out"); whole row links to the stay. Delete the "Identity access is checked again…" sentence (R10).
- [ ] **Step 3: Rooms page.** Room list as one `Panel` table (Room · Floor · Type · Rate · Status · actions), `StatusPill` for room status (VACANT success "Vacant", OCCUPIED neutral "Occupied", CLEANING warning "Cleaning", MAINTENANCE danger "Maintenance"); add-room form as its own `Panel` titled "Add room"; per-row actions (rate, status) keep their current controls, shown inline at the row end.
- [ ] **Step 4: Guests page.** "Current guests" and "Stay history" become two `Panel`s with R8 rows (name · room · checked in/out · StatusPill); drop section descriptions.
- [ ] **Step 5: Reports page.** Filters in a `Panel` header row; each report a `Panel` with R9 table; keep CSV export button as `variant="outline" size="sm"` in that panel's `PanelHeader actions`. Delete the privacy explainer paragraph (R10); keep any data-scope note as one 12px line.
- [ ] **Step 6: Property settings (`hotel-details-page.tsx`).** Form sections as `PanelSection`s inside one `Panel`; Save as the single primary at the end.
- [ ] **Step 7: B2 — My hotels (`hotel/index.tsx`).** Replace the card grid with one `Panel` of R8 rows; **the whole row is the `Link`** to `/hotel/$organizationSlug` (initials tile `size-8 rounded-md bg-muted text-xs font-semibold`, name, "Owner · 1 property", chevron). Same treatment for the properties list on `$organizationSlug/index.tsx` (row links to the property dashboard).
- [ ] **Step 8: Verify** — acceptance grep on these files empty; types exit 0; tests 52 pass. **Stop — leave unstaged.**

### Task 2: Personal workspace pages

**Files:** `routes/_auth/guest.tsx`, `features/guest-stays/components/guest-stays-page.tsx`, `features/guest-stays/components/guest-stay-detail-page.tsx`, `features/guest-profile/components/guest-profile-page.tsx`, `features/identity-documents/components/identity-documents-section.tsx`, `features/identity-documents/components/document-image-field.tsx`, `features/companions/components/companions-page.tsx`, `features/check-in/components/privacy-center-page.tsx`, `features/hotel-registration/components/hotel-registration-page.tsx`.

- [ ] **Step 1: Guest overview (`guest.tsx`).** Title `Welcome, {name}` stays. Keep the 4 destinations as a 2×2 grid of clickable `Panel`s (whole panel is the link): neutral R4 tile · title · one-line description · chevron. "Own a hotel?" becomes a `Panel` row with an outline "Register your hotel" button. Keep the "Ready when you are" block as a calm closing `Panel` (no kicker; sentence-case heading + its one line).
- [ ] **Step 2: My stays + guest stay detail.** List per R8 with `StatusPill`. Detail mirrors the hotel stay detail grammar: header (property name, StatusPill), `FactsRow`, bill `Panel` (read-only table per R9), side `Panel` with access/consent info as `PanelSection`s. Keep every action (revoke etc.) and its `ConfirmDialog`.
- [ ] **Step 3: Travel profile.** Form sections (Personal details, Home address, Emergency contact) become `PanelSection`s of one `Panel` with `PanelHeader`-style section titles (14px semibold, 16px grey icon, no tile); labels stay visible; Save stays the single primary. Readiness side card → a `Panel` with the progress bar (`bg-primary`) and a one-line status; the tinted "Ready for check-in" box becomes a `StatusPill tone="success"`.
- [ ] **Step 4: Identity documents section + image field.** Each document is a `PanelSection` (type · masked/plain number as today · `StatusPill` readiness); image dropzones `rounded-lg border-dashed`. Do not touch capture/compression/upload logic.
- [ ] **Step 5: Companions.** List per R8 (name · relation · `StatusPill` ready/incomplete) with row actions at the end; editor stays a dialog/sheet as today.
- [ ] **Step 6: Privacy center.** Shared stays as R8 rows with `StatusPill` (access active success / ended neutral / revoked danger); access history as an R9 table. Keep revoke actions + dialogs.
- [ ] **Step 7: Register hotel.** Form in one `Panel`; request history as R8 rows with `StatusPill` (PENDING warning, APPROVED success, REJECTED danger + reason as subline).
- [ ] **Step 8: Verify** — acceptance grep empty; types 0; tests 52. **Stop — leave unstaged.**

### Task 3: Platform admin pages (+ B1 second site)

**Files:** `features/platform-organizations/components/organization-list-page.tsx`, `organization-detail-page.tsx`, `organization-onboarding-page.tsx`, `features/hotel-registration/components/hotel-registration-requests-page.tsx`, `features/platform-oversight/components/oversight-page.tsx`.

- [ ] **Step 1: B1 in oversight.** The action filter `Select` uses an `"__all__"` sentinel; pass `items` exactly as Task 1 Step 1 (build `{ value, label }[]` from the existing options, with `"__all__"` → "All actions").
- [ ] **Step 2:** Organization list → one `Panel` R9 table, row links to detail, `StatusPill` Active/Inactive. Detail → `PageHeader` (+ existing `meta`), `FactsRow`, properties and members as `Panel` tables. Onboarding → form `Panel` with sections; the success note becomes one 12px line + `StatusPill tone="success"`. Requests → R8 rows with approve/reject actions at the row end (keep dialogs). Oversight → filters in `PanelHeader`, results as R9 tables.
- [ ] **Step 3: Verify** — acceptance grep empty; types 0; tests 52. **Stop — leave unstaged.**

### Task 4: Public and auth surfaces

**Files:** `routes/index.tsx`, `routes/login.tsx`, `routes/sign-up.tsx`, `routes/check-in/$token.tsx`, `features/check-in/components/check-in-page.tsx`, `features/check-in/components/hotel-arrival-summary.tsx`.

Scope is **token-level only** (spec §3: the guest check-in flow gets its own design round later): apply R1–R5, R7, R10 without restructuring the flow. Specifically:
- [ ] **Step 1:** Remove every `app-kicker`; check-in page title stays `Check in to {hotel}`; the "How access works" side card becomes a `Panel` with a plain bulleted list (no icon tile). The consent checkbox paragraph stays verbatim (it is the consent text — do not edit wording).
- [ ] **Step 2:** `login.tsx` / `sign-up.tsx`: remove eyebrows only. `routes/index.tsx` (public landing): R4/R5 only.
- [ ] **Step 3: Verify** — acceptance grep empty; types 0; tests 52. **Stop — leave unstaged.**

### Task 5: Remove legacy primitives and reference

- [ ] **Step 1:** `grep -rn "Surface\b\|MetricCard\|app-kicker" apps/web/src` — must be empty except the definitions in `design-system.tsx`. If not, finish those call sites first.
- [ ] **Step 2:** Delete `Surface` and `MetricCard` from `apps/web/src/components/design-system.tsx`; delete the `.app-kicker` rule from `packages/ui/src/styles/globals.css`. Leave `.app-surface` (print CSS in `hotel-stay-detail-page.tsx` targets it).
- [ ] **Step 3:** (Reviewer, not the agent — `docs/` is off-limits to agents) delete `docs/design/reference/` and the "Migration in progress" banner in `docs/design-system.md`.
- [ ] **Step 4: Verify** — types 0; tests 52. **Stop — leave unstaged.**
