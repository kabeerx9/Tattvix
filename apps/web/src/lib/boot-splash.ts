// The boot splash lives in index.html so it paints before the bundle loads.
// React never renders its own copy; it only fades this one out, so the
// animation doesn't restart when the app takes over.

const MIN_VISIBLE_MS = 700;
const FADE_MS = 220;

export function getSplashHideDelay(elapsedMs: number, minVisibleMs: number) {
  return Math.max(0, minVisibleMs - elapsedMs);
}

let hiding = false;

export function hideBootSplash() {
  const splash = document.getElementById("boot-splash");
  if (!splash || hiding) return;
  hiding = true;
  window.setTimeout(
    () => {
      splash.classList.add("is-done");
      window.setTimeout(() => splash.remove(), FADE_MS);
    },
    getSplashHideDelay(performance.now(), MIN_VISIBLE_MS),
  );
}
