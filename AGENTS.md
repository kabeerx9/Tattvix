# Project Agent Instructions

## Code Change Explanations

Explain decisions and behavioral changes first, then give a file map grouped
by layer and name the one or two files worth reading. Report verification that
actually ran, remaining gaps, and meaningful tradeoffs. Explain cross-layer
flow when it helps assess the change; keep mechanical changes brief.

## Web Design System

Before creating or changing web or native UI, read and follow `docs/design-system.md`.

- Build with the shared shadcn components from `@tattvix/ui` before creating new primitives.
- Use semantic theme tokens such as `bg-card`, `text-muted-foreground`, and `bg-primary`; do not hardcode brand colors for structural UI.
- Add reusable patterns to the shared UI package or the web design-system layer instead of duplicating long class strings across routes.
- New screens must work in light and dark themes and preserve the visual grammar documented in the design system.
- The native app is guest-only. Do not add platform-admin, owner, manager, reception, or hotel-operations navigation without an explicit product-scope change.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues in `kabeerx9/Tattvix`, driven by the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root, with `plans/` as the MVP scope source. See `docs/agents/domain.md`.
