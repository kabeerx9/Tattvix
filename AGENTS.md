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
- Web is light-theme only until further notice (see `docs/adr/0001-web-visual-language.md`); do not add `dark:` variants. Preserve the visual grammar documented in the design system.
- The native app (Tattwix, `apps/native`) serves hotel staff and guests from one sign-in: hotel mode (owner, manager, reception, gated by `me.memberships[].permissions`) and guest mode. Platform-admin surfaces stay web-only. Scope and decisions: GitHub issue #42 (wayfinder map) and its closed decision tickets.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues in `kabeerx9/Tattvix`, driven by the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: domain docs are `docs/adr/` and `plans/` at the repo root (no `CONTEXT.md` exists yet); see `docs/agents/domain.md`.
