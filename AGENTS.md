# Project Agent Instructions

## Code Change Explanations

Whenever an agent writes or changes code, the final response must explain the work file by file.

For each changed file:

- State the file's purpose in the change.
- Explain the important implementation decisions and behavior.
- Mention meaningful security, data-model, API, routing, or testing implications.
- Do not explain every line or restate obvious syntax.

Also report the verification performed and its result. If verification could not be completed, explain why.

Documentation-only edits can be summarized together when a file-by-file breakdown would add no useful information.

## Web Design System

Before creating or changing web or native UI, read and follow `docs/design-system.md`.

- Build with the shared shadcn components from `@tattvix/ui` before creating new primitives.
- Use semantic theme tokens such as `bg-card`, `text-muted-foreground`, and `bg-primary`; do not hardcode brand colors for structural UI.
- Add reusable patterns to the shared UI package or the web design-system layer instead of duplicating long class strings across routes.
- New screens must work in light and dark themes and preserve the visual grammar documented in the design system.
- The native app is guest-only. Do not add platform-admin, owner, manager, reception, or hotel-operations navigation without an explicit product-scope change.
