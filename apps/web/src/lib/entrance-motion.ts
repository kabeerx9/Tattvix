// The `enter-up` rise for KPI cells and cards (globals.css) is a first-load
// cue, not page-transition decoration: once the first batch has played, mark
// the document settled so later mounts (revisiting a page, switching tabs,
// refetches) render instantly. See docs/design-system.md "Motion".

/** Long enough for a staggered batch (8 × 40ms + 200ms) to finish. */
export const ENTRANCE_SETTLE_MS = 600;
const entranceAnimations = new Set(["enter-up", "enter-fade"]);

export function isEntranceAnimation(name: string) {
  return entranceAnimations.has(name);
}

export function settleEntranceMotionAfterFirstUse(doc: Document = document) {
  const onStart = (event: AnimationEvent) => {
    if (!isEntranceAnimation(event.animationName)) return;
    doc.removeEventListener("animationstart", onStart);
    window.setTimeout(
      () => doc.documentElement.setAttribute("data-motion-settled", ""),
      ENTRANCE_SETTLE_MS,
    );
  };
  doc.addEventListener("animationstart", onStart);
}
