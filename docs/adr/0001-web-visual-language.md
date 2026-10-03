# 0001 — Web visual language: deep teal on white ("A3.1")

Date: 2026-10-03 · Status: accepted (implementation pending) · Scope: web app, light theme

## Context

The web app's design system prescribed marketing-page patterns (eyebrow + 36px hero titles, 16–24px
radius cards, tinted icon tiles on every item, explanatory paragraphs) for an operational
front-desk tool. Every screen followed it, so the product read as templated and the stay detail
needed ~3 screens of scrolling. The hotel overview showed no data at all.

## Options considered

Five throwaway HTML prototypes of the same two screens (hotel overview, stay detail) with identical
data and navigation, varying only visual language:

- **A** — light SaaS, botanical green + lime. *Rejected:* green/lime reads as generic AI-generated UI.
- **B** — warm editorial: cream, terracotta, serif display. *Rejected:* decorative, low density.
- **C** — bold BuildIn-style: big light numerals, orange, SVG floor plan. *Rejected:* look didn't
  fit; the floor plan also requires a room-layout model that doesn't exist.
- **A2** — monochrome ink, sharp 6px radius. *Rejected:* too stark, no warmth.
- **A3** — white + deep teal, imagery. *Liked, but cluttered:* box-in-box, repeated facts,
  three equal columns with no focal point.
- **A3.1** — A3 with the clutter removed (two columns, divider-separated side panel, each fact once,
  collapsed identity images, 24–32px spacing). **Chosen.**

## Decision

Adopt A3.1. Contract in `docs/design-system.md`; full spec in
`docs/superpowers/specs/2026-10-03-web-visual-redesign-design.md`.

## Consequences

- Dark mode is turned off (forced light, toggle removed). The `.dark` tokens stay but are unmaintained.
- Native app is unaffected; its design section now diverges from web.
- The design depends on data the backend doesn't have yet: revenue aggregates, daily occupancy
  history, room/property photos. Widgets needing them are omitted until those exist — never faked.
- Existing shared components (`PageHeader`, `MetricCard`, `Surface`) are replaced, so every page is
  touched during the port.
