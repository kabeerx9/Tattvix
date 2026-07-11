# Tattvix Web Design System

This document is the implementation contract for all Tattvix web UI. It allows a contributor to create a visually consistent screen without access to the original visual references.

## Product character

Tattvix should feel calm, capable, warm, and operational. The interface is a premium hospitality workspace, not a generic admin template. It combines a warm mineral canvas with soft ivory surfaces, deep charcoal typography, and restrained botanical green. Green indicates brand and calm direction—not decoration.

## Foundation

Use shadcn components from `@tattvix/ui` as the first building block. They are source-owned and theme-aware, so extend them centrally when the product needs a different visual treatment.

Preferred hierarchy:

1. Existing `@tattvix/ui` shadcn component.
2. A composed pattern from `apps/web/src/components/design-system.tsx`.
3. A feature-owned component composed from those primitives.
4. A new shared primitive only when the first three cannot express the interaction.

Do not create route-local versions of buttons, cards, inputs, dialogs, dropdowns, comboboxes, sheets, tooltips, or empty states.

## Theme rules

- Use semantic tokens: `background`, `foreground`, `card`, `muted`, `primary`, `accent`, `border`, and their foreground variants.
- Structural UI must never use fixed white, black, gray, purple, or green values.
- Purple gradients, neon accents, multicolor metric cards, and decorative glow effects are not part of this system.
- Semantic status colors may use emerald, amber, sky, or destructive colors, and must include dark-theme variants.
- Theme values live in `packages/ui/src/styles/globals.css`.
- Every screen must remain readable in light, dark, and system themes.

## Shape and elevation

- Controls: 10–12px radius.
- Cards and panels: 16px radius.
- Feature or hero panels: 20–24px radius.
- Pills are reserved for statuses, filters, and compact metadata.
- Default surfaces use a thin low-contrast border and very soft shadow. Avoid heavy drop shadows.
- Nested surfaces should normally use `bg-muted/60` rather than another elevated card.

## Typography

- Page title: 30–36px, semibold, tight tracking.
- Section title: 18–20px, semibold.
- Body: 14px with relaxed line height.
- Supporting text: 12–13px using `text-muted-foreground`.
- Eyebrows use the shared `app-kicker` pattern: 11px, semibold, uppercase, tracked, primary color.
- Use sentence case. Avoid excessive uppercase outside eyebrows and small status labels.

## Layout and spacing

- Application content uses a maximum width of roughly 1400px.
- Page sections are separated by 24–32px.
- Card padding is 16px for compact cards and 24px for normal panels.
- Use 12–16px gaps inside related groups.
- Prefer asymmetric dashboard grids: a wider operational area and a narrower context panel.
- Desktop density should be efficient; mobile layouts must collapse to one readable column.

## Page anatomy

Most authenticated screens should use:

1. `PageHeader` with eyebrow, outcome-oriented title, short description, and at most one primary action.
2. Optional metric row using `MetricCard`.
3. One main `Card`/`Surface` containing the primary workflow.
4. A secondary context or activity panel only when it helps the task.

Do not place every concept in its own floating card. Group related information into clear regions.

## Components and interactions

- Buttons: one primary action per region; secondary actions use outline or ghost variants.
- Inputs: labels are always visible. Placeholder text is an example, not the label.
- Search: use a shadcn Combobox for selection from remote records and show loading, empty, and error states.
- Tables/lists: use a muted header, comfortable rows, subtle separators, and status pills.
- Empty states: explain what belongs in the area and provide one useful next action.
- Navigation: active items use the accent surface and primary-colored icon/text; inactive items remain quiet.
- Icons: Lucide, normally 16–20px. Put important category icons in a softly tinted 40–48px container.

## Content style

Write concise operational language. Prefer “12 arrivals today” over “Reservation records available.” Titles describe the user’s task or situation. Supporting copy should clarify the next decision, not explain implementation details.

## Review checklist

- Built from shadcn/shared components rather than route-local primitives.
- Uses semantic tokens and works in light/dark themes.
- Matches the spacing, radius, typography, and elevation rules above.
- Has a clear primary task and no competing primary buttons.
- Includes loading, empty, error, disabled, and narrow-screen behavior where relevant.
- Does not expose implementation/debug data in user-facing UI.

## Native application

The native app uses the same product character and semantic decisions, adapted for touch interfaces. Its implementation lives in `apps/native/src/design-system`.

- Use `useAppTheme()` instead of hardcoded structural colors.
- Use `Screen`, `Card`, `PageHeader`, `IconTile`, `AppButton`, `AppInput`, and `GuestPage` before creating new native primitives.
- Maintain 48–50px touch targets, 12px control radii, 18px card radii, and 20px screen gutters.
- Bottom navigation is limited to guest Home, Profile, Companions, Privacy, and Account.
- Native content is guest-facing. Do not expose platform roles, hotel memberships, operational dashboards, internal IDs, or debug/API details.
- Support the device light/dark setting automatically.
