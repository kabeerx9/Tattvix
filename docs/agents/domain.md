# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo is **single-context**: one `CONTEXT.md` and one `docs/adr/` at the root. The repo is a monorepo by build layout (`apps/*`, `packages/*`) but serves a single domain — consent-driven hotel identity sharing and check-in — and `packages/contracts` is already the shared vocabulary across `apps/web`, `apps/server`, and `apps/native`. Don't split the glossary per app.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the domain glossary.
- **`docs/adr/`** — read the ADRs that touch the area you're about to work in.
- **`plans/`** — the MVP roadmap and phase plans. `plans/001-tattvix-web-mvp-roadmap.md` is the master scope and sequencing source; `plans/README.md` carries the status table.
- **`docs/tattvix-platform-overview.md`** and **`docs/mvp-identity-contract.md`** — product and identity-contract background.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT.md                 ← domain glossary (created lazily by /domain-modeling)
├── docs/
│   ├── adr/                   ← architecture decision records
│   └── agents/                ← this skill's output
├── plans/                     ← MVP roadmap + phase plans
├── apps/                      ← native, server, web
└── packages/                  ← config, contracts, env, ui
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

Where `CONTEXT.md` is silent, the schemas in `packages/contracts/src` and the models in `apps/server/api/models.py` are the de-facto glossary — prefer their terms (`Stay`, `ConsentGrant`, `SharedIdentitySnapshot`, `OperationalStayStatus`, `Membership`, `Property`) over invented synonyms.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
