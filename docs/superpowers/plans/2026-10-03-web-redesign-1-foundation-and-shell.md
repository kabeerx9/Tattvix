# Web Redesign — Plan 1: Foundation & App Shell

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the whole web app on the A3.1 theme (white, deep teal, Inter, 8px radius, light-only), replace the hero `PageHeader` everywhere, and rebuild the app shell (property switcher, flat nav, user menu).

**Architecture:** Theme lives in CSS variables in `packages/ui/src/styles/globals.css`, consumed via Tailwind semantic classes; shadcn primitives get their radius classes normalised so the token actually reaches them. Shell navigation state is derived by pure functions in `apps/web/src/lib/workspace-navigation.ts` (unit-tested with `node:test`), and `app-shell.tsx` only renders what those functions return.

**Tech Stack:** React 19, TanStack Router, Tailwind v4, shadcn (`base-lyra`, Base UI), Clerk, `next-themes`, `node:test` + `tsx`.

**Spec:** `docs/superpowers/specs/2026-10-03-web-visual-redesign-design.md` (§4, §5, §6, §8 B3/B5, §9, §10 shell, §11 steps 1–3). Contract: `docs/design-system.md`.

**This is plan 1 of 4.** Plan 2: stay detail + overview (+ `KpiStrip`, `Panel`, `FactsRow`, `StatusPill`, shadcn `chart`). Plan 3: remaining pages (B1, B2), removal of `Surface`/`MetricCard`/`.app-kicker`. Plan 4: slug generation fix (server, B4).

**Deviation from spec §11 step 2:** the new shared components (`KpiStrip`, `Panel`, `FactsRow`, `StatusPill`) are built in Plan 2 together with their first consumer, not here — a component with no caller can't be visually verified. Only `PageHeader` is replaced here because it has 20 callers today.

## Global Constraints

- Light theme only. No `dark:` variants in new code. `.dark` block stays in CSS, unmaintained.
- Semantic tokens only in feature code; no hex, no raw `emerald-*`/`amber-*`/`gray-*` classes in new code.
- Radius 8px for panels and controls (`rounded-lg`); shadow only `0 1px 2px rgb(16 24 40 / 0.04)`.
- Page title 22px/600; no eyebrows; no description paragraphs under titles.
- Icons: Lucide 16px (`size-4`).
- Brand in UI copy is "Tattwix" (confirmed). Package/repo identifiers stay `tattvix`; do not rename either.
- **Never commit.** Kabeer reviews unstaged diffs. Each task ends by leaving changes in the working tree.
- Run from repo root unless stated. Tests: `pnpm --filter web test` (added in Task 3). Types: `pnpm --filter web check-types`.

## Review Focus

1. **Signed-in user with no hotel memberships** opens `/hotel` → switcher reads "Choose a hotel · 0 hotels", no crash, sidebar nav is empty, switcher menu still offers "All hotels". Pinned by Task 3 test `returns no context outside a hotel URL` + Task 4 visual step.
2. **Owner whose organization has no properties** → switcher shows the org, property nav is empty, menu offers "Manage properties". Pinned by Task 3 test `returns the organization without a property` and `returns no nav items without a property`.
3. **URL names a hotel the user can't access** (stale link, other tenant) → no context, never silently shows another hotel's name (this is bug B3). Pinned by Task 3 test `ignores organizations the user cannot view`.
4. **Membership lacking `reports:view`** → no Reports nav item. Pinned by Task 3 test `hides reports without permission`.
5. **Collapsed sidebar (icon mode) and mobile sheet** → switcher and user menu still open; tapping a nav link closes the mobile sheet. Pinned by Task 4 visual step at 390px and collapsed desktop.

---

## File map

| Layer | File | Responsibility |
|---|---|---|
| Contract | `packages/ui/src/styles/globals.css` | theme tokens (Task 1) |
| Contract | `apps/web/src/components/design-system.tsx` | `PageHeader` signature (Task 2) |
| Logic | `apps/web/src/lib/workspace-navigation.ts` | `getActiveHotelContext`, `getHotelNavItems` (Task 3) |
| Logic | `apps/web/src/lib/initials.ts` | `getInitials` (Task 3) |
| UI primitives | `packages/ui/src/components/{button,input,select,card}.tsx` | radius normalisation (Task 1) |
| App | `apps/web/src/main.tsx` | font import, forced light theme (Task 1) |
| App | `apps/web/src/components/app-shell.tsx` | rewritten shell (Task 4) |
| App | 20 page files calling `PageHeader` | prop migration (Task 2) |
| Delete | `apps/web/src/components/mode-toggle.tsx`, `apps/web/src/components/placeholder-page.tsx` | dead after Tasks 1/2 |
| Tooling | `apps/web/package.json` | `test` script (Task 3) |

---

### Task 1: Theme foundation (tokens, font, radius, light lock)

**Files:**
- Modify: `packages/ui/src/styles/globals.css` (`:root` block, `.dark` comment, `@theme inline`, `@layer base`, `.app-surface`)
- Modify: `packages/ui/src/components/button.tsx`, `input.tsx`, `select.tsx`, `card.tsx` (radius classes)
- Modify: `apps/web/src/main.tsx` (font import, ThemeProvider props)
- Modify: `apps/web/src/components/app-shell.tsx`, `apps/web/src/features/check-in/components/check-in-page.tsx`, `apps/web/src/routes/check-in/$token.tsx` (remove `ModeToggle`)
- Delete: `apps/web/src/components/mode-toggle.tsx`
- Modify: `apps/web/package.json` (dependency)

**Interfaces:**
- Produces Tailwind classes used by later tasks/plans: `text-subtle-foreground`, `border-border-soft`, `bg-primary-hover`, `text-success`/`bg-success-tint`, `text-warning`/`bg-warning-tint`, `bg-destructive-tint`.

No unit test: this is CSS + config. Verification is type-check plus a browser check with exact pass criteria (Step 9).

- [ ] **Step 1: Replace the `:root` block in `packages/ui/src/styles/globals.css`**

Replace everything from `:root {` through its closing `}` with:

```css
:root {
  --background: #ffffff;
  --foreground: #0f1720;
  --card: #ffffff;
  --card-foreground: #0f1720;
  --popover: #ffffff;
  --popover-foreground: #0f1720;
  --primary: #0f5f5c;
  --primary-hover: #0b4a47;
  --primary-foreground: #ffffff;
  --secondary: #f2f4f7;
  --secondary-foreground: #0f1720;
  --muted: #f2f4f7;
  --muted-foreground: #475467;
  --subtle-foreground: #8a94a3;
  --accent: #f2f4f7;
  --accent-foreground: #0f1720;
  --primary-tint: #e8f3f2;
  --success: #0f5f5c;
  --success-tint: #e8f3f2;
  --warning: #b54708;
  --warning-tint: #fef4e6;
  --destructive: #b42318;
  --destructive-tint: #feeceb;
  --border: #e7e9ec;
  --border-soft: #f0f1f3;
  --input: #e7e9ec;
  --ring: rgb(15 95 92 / 0.4);
  --chart-1: #0f5f5c;
  --chart-2: #c9ced6;
  --chart-3: #f0b86e;
  --chart-4: #8fcfc9;
  --chart-5: #d0d5dd;
  --radius: 0.5rem;
  --sidebar: #ffffff;
  --sidebar-foreground: #0f1720;
  --sidebar-primary: #0f5f5c;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #e8f3f2;
  --sidebar-accent-foreground: #0f5f5c;
  --sidebar-border: #e7e9ec;
  --sidebar-ring: rgb(15 95 92 / 0.4);
}
```

- [ ] **Step 2: Mark the dark block unmaintained**

Directly above `.dark {` insert:

```css
/* Unmaintained since the 2026-10 redesign (docs/adr/0001-web-visual-language.md).
   The web app forces light theme; kept so reviving dark mode is additive. */
```

- [ ] **Step 3: Register the new tokens in `@theme inline`**

Inside `@theme inline { ... }`, after `--color-destructive: var(--destructive);` add:

```css
  --color-destructive-tint: var(--destructive-tint);
  --color-subtle-foreground: var(--subtle-foreground);
  --color-border-soft: var(--border-soft);
  --color-primary-hover: var(--primary-hover);
  --color-primary-tint: var(--primary-tint);
  --color-success: var(--success);
  --color-success-tint: var(--success-tint);
  --color-warning: var(--warning);
  --color-warning-tint: var(--warning-tint);
```

- [ ] **Step 4: Font features and lighter surface**

In `@layer base`, replace the `body { ... }` rule with:

```css
  body {
    @apply font-sans bg-background text-foreground antialiased;
    font-feature-settings: "cv11", "ss01";
  }
```

In `@layer components`, replace the `.app-surface` rule with:

```css
  .app-surface {
    @apply rounded-lg border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04)];
  }
```

Leave `.app-kicker` untouched (removed in Plan 3 with its last caller).

- [ ] **Step 5: Normalise primitive radii so `--radius` reaches them**

`base-lyra` hard-codes `rounded-xl`/`rounded-2xl`; with `--radius: 0.5rem` those resolve to 12px/16px, not 8px.

```bash
cd packages/ui/src/components
sed -i '' 's/rounded-xl/rounded-lg/g' button.tsx input.tsx select.tsx
sed -i '' -e 's/rounded-2xl/rounded-lg/' -e 's/rounded-t-2xl/rounded-t-lg/' -e 's/rounded-b-2xl/rounded-b-lg/' card.tsx
sed -i '' 's#ring-foreground/10#ring-border#g' card.tsx select.tsx dropdown-menu.tsx combobox.tsx
cd -
grep -n "rounded-xl\|rounded-2xl\|ring-foreground/10" packages/ui/src/components/{button,input,select,card,dropdown-menu,combobox}.tsx
```

Expected: the final `grep` prints nothing.

- [ ] **Step 6: Load Inter**

```bash
pnpm --filter web add @fontsource-variable/inter@^5.3.0
```

In `apps/web/src/main.tsx`, add as the first import line:

```ts
import "@fontsource-variable/inter";
```

(The package registers the family as `"Inter Variable"`, which `globals.css` already names in `--font-sans`.)

- [ ] **Step 7: Force light theme**

In `apps/web/src/main.tsx`, replace the `<ThemeProvider ...>` opening tag with:

```tsx
    <ThemeProvider
      attribute="class"
      forcedTheme="light"
      defaultTheme="light"
      disableTransitionOnChange
      storageKey="vite-ui-theme"
    >
```

- [ ] **Step 8: Remove the mode toggle everywhere**

In each of `apps/web/src/components/app-shell.tsx`, `apps/web/src/features/check-in/components/check-in-page.tsx`, `apps/web/src/routes/check-in/$token.tsx`: delete the line `import { ModeToggle } from "@/components/mode-toggle";` and the `<ModeToggle />` element. Then:

```bash
rm apps/web/src/components/mode-toggle.tsx
grep -rn "ModeToggle\|mode-toggle" apps/web/src
```

Expected: no output.

- [ ] **Step 9: Verify**

```bash
pnpm --filter web check-types
```
Expected: exits 0.

With `pnpm dev:web` running, open `http://localhost:3001/hotel` signed in. In the browser console run:

```js
await document.fonts.ready;
[getComputedStyle(document.body).backgroundColor,
 getComputedStyle(document.body).fontFamily,
 [...document.fonts].filter(f => f.family === "Inter Variable" && f.unicodeRange.startsWith("U+0-FF")).map(f => f.status),
 document.documentElement.classList.contains("dark")]
```
Expected: `["rgb(255, 255, 255)", "\"Inter Variable\", sans-serif", ["loaded"], false]`. (Don't use `document.fonts.check()` — it returns `true` for families the page never declared.) Then run `localStorage.setItem("vite-ui-theme","dark"); location.reload()` and re-run the snippet — still `false` for dark. Visually: buttons, inputs and cards have 8px corners and teal primary. Old layouts in new colours are expected.

- [ ] **Step 10: Stop — leave changes unstaged** and report to Kabeer.

---

### Task 2: Compact `PageHeader` and migrate every caller

**Files:**
- Modify: `apps/web/src/components/design-system.tsx` (`PageHeader` only)
- Modify (20 callers): see table in Step 2
- Delete: `apps/web/src/components/placeholder-page.tsx` (no callers — `grep -rn PlaceholderPage apps/web/src` returns only its own file)

**Interfaces:**
- Produces: `PageHeader({ title: string; meta?: React.ReactNode; actions?: React.ReactNode })`. Removed props: `eyebrow`, `description`, `action`.

No unit test (presentational; no React test harness in this repo). The type-checker enforces every call site.

- [ ] **Step 1: Replace `PageHeader` in `design-system.tsx`**

Replace the existing one-line `export function PageHeader(...)` with:

```tsx
export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="truncate text-[22px] font-semibold tracking-[-0.02em]">
          {title}
        </h1>
        {meta ? (
          <p className="truncate text-sm text-subtle-foreground">{meta}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
```

- [ ] **Step 2: Run type-check to list broken callers**

```bash
pnpm --filter web check-types 2>&1 | grep -E "eyebrow|description|action" | head -40
```
Expected: errors at each caller below.

- [ ] **Step 3: Migrate each caller**

At every call site: delete `eyebrow`; rename `action=` → `actions=`; handle `description` and `title` as listed. "drop" means delete the prop.

| File | title | description |
|---|---|---|
| `features/hotel-operations/components/hotel-guests-page.tsx` | `Guests` | drop |
| `features/hotel-operations/components/hotel-rooms-page.tsx` | `Rooms` | drop |
| `features/hotel-reports/components/hotel-reports-page.tsx` | `Reports` | drop |
| `features/hotel-stays/components/hotel-stays-page.tsx` | `Guest stays` → `Stays` | drop |
| `features/hotel-stays/components/hotel-stay-detail-page.tsx` | unchanged | drop (status is shown in the page body; page is rebuilt in Plan 2). If `accessDescription` becomes unused, delete it. |
| `features/hotel-details/components/hotel-details-page.tsx` | `Hotel details` → `Property settings` | drop |
| `features/hotel-registration/components/hotel-registration-page.tsx` | unchanged | `meta="Reviewed by a platform admin before access is granted"` |
| `features/hotel-registration/components/hotel-registration-requests-page.tsx` | unchanged | drop |
| `features/check-in/components/privacy-center-page.tsx` | unchanged | drop |
| `features/guest-stays/components/guest-stays-page.tsx` | unchanged | drop |
| `features/guest-stays/components/guest-stay-detail-page.tsx` | unchanged | drop |
| `features/guest-profile/components/guest-profile-page.tsx` | unchanged | drop |
| `features/companions/components/companions-page.tsx` | unchanged | drop |
| `features/platform-oversight/components/oversight-page.tsx` | unchanged | drop |
| `features/platform-organizations/components/organization-list-page.tsx` | unchanged | drop |
| `features/platform-organizations/components/organization-detail-page.tsx` | unchanged | move the existing template string to `meta={...}` unchanged |
| `routes/_auth/guest.tsx` | unchanged | drop |
| `routes/_auth/_hotel/hotel/index.tsx` | unchanged | drop |
| `routes/_auth/_hotel/hotel/$organizationSlug/index.tsx` | unchanged | drop |
| `routes/_auth/_hotel/hotel/$organizationSlug/$propertySlug/dashboard.tsx` | `Your hotel overview` → `Overview` | drop |

After editing, remove any import or local variable that became unused (e.g. a `propertyName` only used for `eyebrow`). Then:

```bash
rm apps/web/src/components/placeholder-page.tsx
grep -rn -A4 "<PageHeader" apps/web/src | grep -E "eyebrow=| action="
```
Expected: no output. (A plain `grep eyebrow=` also matches `CheckInUnavailablePage` in `routes/check-in/$token.tsx`, which has its own unrelated `eyebrow` prop — out of scope here; the type-check is the real enforcement.)

- [ ] **Step 4: Verify**

```bash
pnpm --filter web check-types
```
Expected: exits 0. In the browser, open `/hotel`, a property's Stays page, and `/profile`: titles are 22px, no uppercase eyebrow, no paragraph under the title, primary actions still present and clickable.

- [ ] **Step 5: Stop — leave changes unstaged** and report.

---

### Task 3: Navigation model (pure functions, test-first)

**Files:**
- Modify: `apps/web/package.json` (add `test` script)
- Modify: `apps/web/src/lib/workspace-navigation.ts`
- Modify: `apps/web/src/lib/workspace-navigation.test.ts`
- Create: `apps/web/src/lib/initials.ts`, `apps/web/src/lib/initials.test.ts`

**Interfaces:**
- Consumes: `MeResponse` from `@tattvix/contracts`.
- Produces (used by Task 4):

```ts
export type HotelMembership = MeResponse["memberships"][number];
export type HotelProperty = HotelMembership["properties"][number];
export type ActiveHotelContext = { membership: HotelMembership; property: HotelProperty | null };
export function getActiveHotelContext(user: MeResponse | null, pathname: string): ActiveHotelContext | null;

export type HotelNavKey = "overview" | "stays" | "rooms" | "guests" | "reports" | "settings";
export type HotelNavRoute =
  | "/hotel/$organizationSlug/$propertySlug/dashboard"
  | "/hotel/$organizationSlug/$propertySlug/stays"
  | "/hotel/$organizationSlug/$propertySlug/rooms"
  | "/hotel/$organizationSlug/$propertySlug/guests"
  | "/hotel/$organizationSlug/$propertySlug/reports"
  | "/hotel/$organizationSlug/$propertySlug/details";
export type HotelNavItem = { key: HotelNavKey; label: string; to: HotelNavRoute; isActive: boolean };
export function getHotelNavItems(context: ActiveHotelContext, pathname: string): HotelNavItem[];

// initials.ts
export function getInitials(name: string): string;
```

- [ ] **Step 1: Add the web test script**

In `apps/web/package.json` `"scripts"`, add:

```json
    "test": "node --import tsx --test 'src/**/*.test.ts'",
```

Run: `pnpm --filter web test` → Expected: 21 passing (the existing suites, previously never run by `pnpm test`).

- [ ] **Step 2: Write failing tests**

Append to `apps/web/src/lib/workspace-navigation.test.ts` (reuses the existing `user` fixture; extend the import to include `getActiveHotelContext` and `getHotelNavItems`):

```ts
describe("active hotel context", () => {
  it("returns no context outside a hotel URL", () => {
    assert.equal(getActiveHotelContext(user, "/hotel"), null);
    assert.equal(getActiveHotelContext(user, "/profile"), null);
    assert.equal(getActiveHotelContext(null, "/hotel/first/main"), null);
  });
  it("resolves the organization and property named in the URL", () => {
    const context = getActiveHotelContext(user, "/hotel/second/branch/rooms");
    assert.equal(context?.membership.organization.slug, "second");
    assert.equal(context?.property?.slug, "branch");
  });
  it("returns the organization without a property", () => {
    const context = getActiveHotelContext(user, "/hotel/first");
    assert.equal(context?.membership.organization.slug, "first");
    assert.equal(context?.property, null);
  });
  it("ignores organizations the user cannot view", () => {
    assert.equal(getActiveHotelContext(user, "/hotel/someone-else/main"), null);
    const noView: MeResponse = {
      ...user,
      memberships: [{ ...user.memberships[0], permissions: [] }],
    };
    assert.equal(getActiveHotelContext(noView, "/hotel/first/main"), null);
  });
});

describe("hotel navigation items", () => {
  const context = getActiveHotelContext(user, "/hotel/first/main/stays/abc")!;
  it("lists property pages in order and marks the active one", () => {
    const items = getHotelNavItems(context, "/hotel/first/main/stays/abc");
    assert.deepEqual(
      items.map((item) => item.key),
      ["overview", "stays", "rooms", "guests", "settings"],
    );
    assert.deepEqual(
      items.filter((item) => item.isActive).map((item) => item.key),
      ["stays"],
    );
  });
  it("maps the details route to property settings", () => {
    const items = getHotelNavItems(context, "/hotel/first/main/details");
    assert.equal(items.find((item) => item.isActive)?.label, "Property settings");
  });
  it("hides reports without permission", () => {
    const keys = getHotelNavItems(context, "/hotel/first/main").map((i) => i.key);
    assert.equal(keys.includes("reports"), false);
  });
  it("shows reports with permission", () => {
    const withReports = {
      ...context,
      membership: {
        ...context.membership,
        permissions: [...context.membership.permissions, "reports:view" as const],
      },
    };
    const keys = getHotelNavItems(withReports, "/hotel/first/main").map((i) => i.key);
    assert.deepEqual(keys, ["overview", "stays", "rooms", "guests", "reports", "settings"]);
  });
  it("returns no nav items without a property", () => {
    const orgOnly = getActiveHotelContext(user, "/hotel/first")!;
    assert.deepEqual(getHotelNavItems(orgOnly, "/hotel/first"), []);
  });
});
```

Create `apps/web/src/lib/initials.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getInitials } from "./initials";

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    assert.equal(getInitials("The Lalit Chugtiya"), "TL");
    assert.equal(getInitials("kabeer joshi"), "KJ");
  });
  it("handles single words, extra spaces and empty input", () => {
    assert.equal(getInitials("Mulla"), "M");
    assert.equal(getInitials("  Riya   Mehta "), "RM");
    assert.equal(getInitials(""), "?");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter web test`
Expected: FAIL — `getActiveHotelContext`/`getHotelNavItems` are not exported; `./initials` cannot be resolved.

- [ ] **Step 4: Implement**

Append to `apps/web/src/lib/workspace-navigation.ts`:

```ts
export type HotelMembership = MeResponse["memberships"][number];
export type HotelProperty = HotelMembership["properties"][number];
export type ActiveHotelContext = {
  membership: HotelMembership;
  property: HotelProperty | null;
};

// Unlike getHotelDestination, never falls back to another membership: this
// answers "which hotel is the user looking at", which may be none.
export function getActiveHotelContext(
  user: MeResponse | null,
  pathname: string,
): ActiveHotelContext | null {
  const [prefix, organizationSlug, propertySlug] = pathname
    .split("/")
    .filter(Boolean);
  if (prefix !== "hotel" || !organizationSlug) return null;
  const membership = user?.memberships.find(
    (item) =>
      item.permissions.includes("hotel:view") &&
      item.organization.slug === organizationSlug,
  );
  if (!membership) return null;
  const property =
    membership.properties.find((item) => item.slug === propertySlug) ?? null;
  return { membership, property };
}

export type HotelNavKey =
  | "overview"
  | "stays"
  | "rooms"
  | "guests"
  | "reports"
  | "settings";
export type HotelNavRoute =
  | "/hotel/$organizationSlug/$propertySlug/dashboard"
  | "/hotel/$organizationSlug/$propertySlug/stays"
  | "/hotel/$organizationSlug/$propertySlug/rooms"
  | "/hotel/$organizationSlug/$propertySlug/guests"
  | "/hotel/$organizationSlug/$propertySlug/reports"
  | "/hotel/$organizationSlug/$propertySlug/details";
export type HotelNavItem = {
  key: HotelNavKey;
  label: string;
  to: HotelNavRoute;
  isActive: boolean;
};

const hotelNav: { key: HotelNavKey; label: string; segment: string }[] = [
  { key: "overview", label: "Overview", segment: "dashboard" },
  { key: "stays", label: "Stays", segment: "stays" },
  { key: "rooms", label: "Rooms", segment: "rooms" },
  { key: "guests", label: "Guests", segment: "guests" },
  { key: "reports", label: "Reports", segment: "reports" },
  { key: "settings", label: "Property settings", segment: "details" },
];

export function getHotelNavItems(
  context: ActiveHotelContext,
  pathname: string,
): HotelNavItem[] {
  if (!context.property) return [];
  const activeSegment = pathname.split("/").filter(Boolean)[3];
  const canViewReports = context.membership.permissions.includes("reports:view");
  return hotelNav
    .filter((item) => item.key !== "reports" || canViewReports)
    .map((item) => ({
      key: item.key,
      label: item.label,
      to: `/hotel/$organizationSlug/$propertySlug/${item.segment}` as HotelNavRoute,
      isActive: item.segment === activeSegment,
    }));
}
```

Create `apps/web/src/lib/initials.ts`:

```ts
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter web test`
Expected: all pass (21 existing + 11 new = 32).

Run: `pnpm --filter web check-types` → exits 0.

- [ ] **Step 6: Stop — leave changes unstaged** and report.

---

### Task 4: App shell — property switcher, flat nav, user menu

**Files:**
- Modify (rewrite): `apps/web/src/components/app-shell.tsx`

**Interfaces:**
- Consumes: `getActiveWorkspace`, `getHotelDestination`, `getActiveHotelContext`, `getHotelNavItems`, `HotelNavKey` (Task 3); `getInitials` (Task 3); `hasAnyHotelPermission`, `hasPlatformPermission` from `@/lib/router-auth`; Clerk `useUser`, `useClerk`.
- Produces: `AppShell({ children })` — same export and props as today, so no route file changes.

Fixes: **B3** (switcher uses `getActiveHotelContext`, no fallback), **B5** (single "Property settings"; "Hotel & properties" → switcher "Manage properties"; "My hotels" → switcher "All hotels"). Removes: header workspace label, Personal/Hotel/Platform pill tabs, Clerk `UserButton`. Search box from the prototype is **not** built (no search backend — would be a dead affordance).

- [ ] **Step 1: Replace the file contents**

```tsx
import { useClerk, useUser } from "@clerk/react";
import { Link, useLocation, useRouteContext } from "@tanstack/react-router";
import {
  BarChart3,
  BedDouble,
  Building2,
  Check,
  ChevronsUpDown,
  ClipboardCheck,
  Contact,
  Gauge,
  IdCard,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tattvix/ui/components/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@tattvix/ui/components/sidebar";
import { TooltipProvider } from "@tattvix/ui/components/tooltip";

import { getInitials } from "@/lib/initials";
import {
  hasAnyHotelPermission,
  hasPlatformPermission,
} from "@/lib/router-auth";
import {
  getActiveHotelContext,
  getActiveWorkspace,
  getHotelDestination,
  getHotelNavItems,
  type HotelNavKey,
} from "@/lib/workspace-navigation";

type Icon = React.ComponentType<{ className?: string }>;
type FlatNavItem = {
  label: string;
  to:
    | "/guest"
    | "/stays"
    | "/profile"
    | "/companions"
    | "/privacy"
    | "/register-hotel"
    | "/settings"
    | "/admin"
    | "/admin/requests";
  icon: Icon;
};

const personalNav: FlatNavItem[] = [
  { label: "Overview", to: "/guest", icon: Contact },
  { label: "My stays", to: "/stays", icon: ClipboardCheck },
  { label: "Travel profile", to: "/profile", icon: IdCard },
  { label: "Companions", to: "/companions", icon: UsersRound },
  { label: "Privacy center", to: "/privacy", icon: ShieldCheck },
  { label: "Register hotel", to: "/register-hotel", icon: Building2 },
  { label: "Account settings", to: "/settings", icon: Settings },
];

const platformNav: FlatNavItem[] = [
  { label: "Super admin", to: "/admin", icon: ShieldCheck },
  { label: "Hotel requests", to: "/admin/requests", icon: ClipboardCheck },
];

const hotelNavIcons: Record<HotelNavKey, Icon> = {
  overview: Gauge,
  stays: ClipboardCheck,
  rooms: BedDouble,
  guests: Users,
  reports: BarChart3,
  settings: Settings,
};

function isFlatItemActive(item: FlatNavItem, pathname: string) {
  return (
    pathname === item.to ||
    (item.to === "/stays" && pathname.startsWith("/stays/"))
  );
}

function useSectionLabel() {
  const { pathname } = useLocation();
  const { auth } = useRouteContext({ from: "__root__" });
  const workspace = getActiveWorkspace(pathname);
  if (workspace === "hotel") {
    const context = getActiveHotelContext(auth.currentUser, pathname);
    if (!context) return "Hotels";
    return (
      getHotelNavItems(context, pathname).find((item) => item.isActive)
        ?.label ?? context.membership.organization.name
    );
  }
  const items = workspace === "platform" ? platformNav : personalNav;
  return items.find((item) => isFlatItemActive(item, pathname))?.label ?? "";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const sectionLabel = useSectionLabel();
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-background">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-8">
            <SidebarTrigger className="-ml-1" />
            <p className="truncate text-sm font-medium">{sectionLabel}</p>
          </header>
          <main className="flex-1 p-4 sm:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

function AppSidebar() {
  const { pathname } = useLocation();
  const workspace = getActiveWorkspace(pathname);
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3 px-3 pt-4">
        <div className="flex items-center gap-2 px-1">
          <span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="size-3.5" />
          </span>
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Tattwix
          </span>
        </div>
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspace === "hotel" ? <HotelNav /> : null}
              {workspace === "personal" ? <FlatNav items={personalNav} /> : null}
              {workspace === "platform" ? <FlatNav items={platformNav} /> : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-3">
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function SwitcherTile({ label }: { label: string }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-xs font-semibold text-accent-foreground">
      {getInitials(label)}
    </span>
  );
}

function WorkspaceSwitcher() {
  const { pathname } = useLocation();
  const { auth } = useRouteContext({ from: "__root__" });
  const { setOpenMobile } = useSidebar();
  const workspace = getActiveWorkspace(pathname);

  if (workspace !== "hotel") {
    const title = workspace === "platform" ? "Platform admin" : "Personal";
    const detail = workspace === "platform" ? "Super admin" : "Travel & identity";
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-border p-2">
        <SwitcherTile label={title} />
        <span className="min-w-0 group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-sm font-semibold">{title}</span>
          <span className="block truncate text-xs text-subtle-foreground">{detail}</span>
        </span>
      </div>
    );
  }

  const context = getActiveHotelContext(auth.currentUser, pathname);
  const memberships =
    auth.currentUser?.memberships.filter((item) =>
      item.permissions.includes("hotel:view"),
    ) ?? [];
  const title = context?.membership.organization.name ?? "Choose a hotel";
  const detail = context
    ? [
        context.property && context.property.name !== title
          ? context.property.name
          : null,
        formatRole(context.membership.role),
      ]
        .filter(Boolean)
        .join(" · ")
    : `${memberships.length} ${memberships.length === 1 ? "hotel" : "hotels"}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2.5 rounded-lg border border-border p-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Switch hotel"
      >
        <SwitcherTile label={title} />
        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-sm font-semibold">{title}</span>
          <span className="block truncate text-xs text-subtle-foreground">{detail}</span>
        </span>
        <ChevronsUpDown className="size-4 text-subtle-foreground group-data-[collapsible=icon]:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Hotels</DropdownMenuLabel>
          {memberships.flatMap((membership) =>
            membership.properties.length === 0
              ? [
                  <DropdownMenuItem
                    key={`org-${membership.id}`}
                    onClick={() => setOpenMobile(false)}
                    render={
                      <Link
                        to="/hotel/$organizationSlug"
                        params={{ organizationSlug: membership.organization.slug }}
                      />
                    }
                  >
                    <span className="flex-1 truncate">{membership.organization.name}</span>
                  </DropdownMenuItem>,
                ]
              : membership.properties.map((property) => {
                  const active =
                    context?.membership.id === membership.id &&
                    context.property?.id === property.id;
                  return (
                    <DropdownMenuItem
                      key={`prop-${property.id}`}
                      onClick={() => setOpenMobile(false)}
                      render={
                        <Link
                          to="/hotel/$organizationSlug/$propertySlug/dashboard"
                          params={{
                            organizationSlug: membership.organization.slug,
                            propertySlug: property.slug,
                          }}
                        />
                      }
                    >
                      <span className="flex-1 truncate">
                        {membership.organization.name}
                        {property.name !== membership.organization.name
                          ? ` · ${property.name}`
                          : ""}
                      </span>
                      {active ? <Check className="size-4 text-primary" /> : null}
                    </DropdownMenuItem>
                  );
                }),
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {context ? (
          <DropdownMenuItem
            onClick={() => setOpenMobile(false)}
            render={
              <Link
                to="/hotel/$organizationSlug"
                params={{ organizationSlug: context.membership.organization.slug }}
              />
            }
          >
            <Building2 className="size-4" />
            Manage properties
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() => setOpenMobile(false)}
          render={<Link to="/hotel" />}
        >
          <Building2 className="size-4" />
          All hotels
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HotelNav() {
  const { pathname } = useLocation();
  const { auth } = useRouteContext({ from: "__root__" });
  const { setOpenMobile } = useSidebar();
  const context = getActiveHotelContext(auth.currentUser, pathname);
  if (!context?.property) return null;
  const params = {
    organizationSlug: context.membership.organization.slug,
    propertySlug: context.property.slug,
  };
  return getHotelNavItems(context, pathname).map((item) => {
    const ItemIcon = hotelNavIcons[item.key];
    return (
      <SidebarMenuItem key={item.key}>
        <SidebarMenuButton
          isActive={item.isActive}
          tooltip={item.label}
          className="h-9 rounded-lg px-2.5 font-medium data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
          render={
            <Link
              to={item.to}
              params={params}
              onClick={() => setOpenMobile(false)}
            />
          }
        >
          <ItemIcon className="size-4" />
          <span className="truncate">{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  });
}

function FlatNav({ items }: { items: FlatNavItem[] }) {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  return items.map((item) => {
    const isActive = isFlatItemActive(item, pathname);
    return (
      <SidebarMenuItem key={item.to}>
        <SidebarMenuButton
          isActive={isActive}
          tooltip={item.label}
          className="h-9 rounded-lg px-2.5 font-medium data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
          render={<Link to={item.to} onClick={() => setOpenMobile(false)} />}
        >
          <item.icon className="size-4" />
          <span className="truncate">{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  });
}

function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { auth } = useRouteContext({ from: "__root__" });
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  const workspace = getActiveWorkspace(pathname);
  const hotelDestination = getHotelDestination(auth.currentUser, pathname);
  const name =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.username ||
    "Signed in";
  const close = () => setOpenMobile(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Account and workspaces"
      >
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt="" className="size-8 shrink-0 rounded-full" />
        ) : (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
            {getInitials(name)}
          </span>
        )}
        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-subtle-foreground">Switch workspace</span>
        </span>
        <ChevronsUpDown className="size-4 text-subtle-foreground group-data-[collapsible=icon]:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuItem onClick={close} render={<Link to="/guest" />}>
            <UserRound className="size-4" />
            <span className="flex-1">Personal</span>
            {workspace === "personal" ? <Check className="size-4 text-primary" /> : null}
          </DropdownMenuItem>
          {hasAnyHotelPermission(auth, "hotel:view") ? (
            <DropdownMenuItem onClick={close} render={<Link {...hotelDestination} />}>
              <Building2 className="size-4" />
              <span className="flex-1">Hotel</span>
              {workspace === "hotel" ? <Check className="size-4 text-primary" /> : null}
            </DropdownMenuItem>
          ) : null}
          {hasPlatformPermission(auth, "platform:admin") ? (
            <DropdownMenuItem onClick={close} render={<Link to="/admin" />}>
              <ShieldCheck className="size-4" />
              <span className="flex-1">Platform</span>
              {workspace === "platform" ? <Check className="size-4 text-primary" /> : null}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={close} render={<Link to="/settings" />}>
          <Settings className="size-4" />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/login" })}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatRole(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
```

- [ ] **Step 2: Type-check and fix API mismatches**

Run: `pnpm --filter web check-types`
Expected: exits 0. If it fails on `render` for `DropdownMenuItem`/`DropdownMenuTrigger` or on `data-active:` class usage, read `packages/ui/src/components/dropdown-menu.tsx` and `sidebar.tsx` and adapt to the primitive's actual props (Base UI `Menu.Item` and `Menu.Trigger` accept `render`; `SidebarMenuButton` sets `data-active`). Do not change the primitives themselves.

Run: `pnpm --filter web test` → all pass (unchanged from Task 3).

- [ ] **Step 3: Verify in the browser**

With `pnpm dev:web` running, signed in as an owner with ≥1 hotel:

1. `/hotel` → switcher reads **"Choose a hotel"** with "N hotels" (B3 fixed); sidebar has no hotel nav items.
2. Pick a property from the switcher → lands on its Overview; switcher shows the org name and role; nav shows Overview · Stays · Rooms · Guests · (Reports if permitted) · Property settings; exactly one item highlighted; header shows the same label.
3. Nav contains **no** "Hotel details", "Hotel & properties" or "My hotels" (B5 fixed); "Manage properties" and "All hotels" are in the switcher menu.
4. User menu (sidebar foot) → switch to Personal and back to Hotel; Platform appears only for platform admins; Account settings opens `/settings`; Sign out returns to `/login`.
5. Collapse the sidebar (rail or ⌘B): switcher and user menu still open from their tiles; tooltips show nav labels.
6. Resize to 390px: hamburger opens the sheet; tapping any nav link or switcher item closes it.
7. Long hotel name truncates with an ellipsis in the switcher, not wrapping.

- [ ] **Step 4: Stop — leave changes unstaged** and report to Kabeer with the file map and which checks were verified vs reasoned.
