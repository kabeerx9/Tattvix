# Project Agent Instructions

## Code Change Explanations

Explain decisions and behavioral changes first, then give a file map grouped
by layer and name the one or two files worth reading. Report verification that
actually ran, remaining gaps, and meaningful tradeoffs. Explain cross-layer
flow when it helps assess the change; keep mechanical changes brief.

## Pre-launch: web and native move together

Tattwix has not launched. There are no real users and no installed builds to
protect, so there is no backward compatibility, no data migration path, no
over-the-air update concern and no "would this break a build on someone's
phone" check. Pick the best fix, including new native dependencies, a new dev
build, a breaking API or contract change, or a reseed. Kabeer will say when it
launches; only then do compatibility, rollout and update strategy come back.

Every feature, behaviour change, copy change or bug fix still lands in **both**
the web app (`apps/web`) and the native app (`apps/native`, Android) in the same
piece of work. If it genuinely cannot apply to the other, say so in the summary
and why.

- Put shared logic in the packages (`@tattvix/contracts` for schemas and
  types, `@tattvix/api` for query keys, API functions and pure domain
  helpers) and have both apps consume it, rather than duplicating it per app.
- The web app is the primary client.
- Verify both: web `check-types`, `test` and `build`; native `tsc --noEmit`
  and `test`, plus an emulator check for anything a user sees.

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
