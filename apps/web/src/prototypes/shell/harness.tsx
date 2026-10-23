// Picker harness (spec: ~/.claude/skills/prototype/PICKER.md). Renders one
// direction at a time, full page. 1-3 / arrows switch direction, R replays,
// S flips between the two screens (also reachable from each variant's nav).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import "./palettes.css";
import type { Screen } from "./common";
import { ConciergeVariant } from "./variant-concierge";
import { HostVariant } from "./variant-host";
import { LedgerVariant } from "./variant-ledger";

const variants = [
  { name: "Host", palette: "host", Component: HostVariant, ownsBottomOnPhone: true },
  { name: "Ledger", palette: "ledger", Component: LedgerVariant, ownsBottomOnPhone: true },
  { name: "Concierge", palette: "concierge", Component: ConciergeVariant, ownsBottomOnPhone: false },
] as const;

function initialIndex() {
  const value = Number.parseInt(new URLSearchParams(window.location.search).get("v") ?? "", 10);
  return value >= 1 && value <= variants.length ? value - 1 : 0;
}

function initialScreen(): Screen {
  return new URLSearchParams(window.location.search).get("screen") === "today" ? "today" : "hotels";
}

function writeParams(params: Record<string, string>) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  window.history.replaceState(window.history.state, "", url);
}

export function ShellPrototypes() {
  const [current, setCurrent] = useState(initialIndex);
  const [screen, setScreenState] = useState<Screen>(initialScreen);
  const [mountKey, setMountKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const highlight = useRef<HTMLSpanElement>(null);
  const variant = variants[current]!;

  // Token swap: the palette block applies to <html>, so portalled sheets match.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.protoPalette = variant.palette;
    return () => {
      delete root.dataset.protoPalette;
    };
  }, [variant.palette]);

  const moveHighlight = useCallback(() => {
    const el = items.current[current];
    if (!el || !highlight.current) return;
    highlight.current.style.width = `${el.offsetWidth}px`;
    highlight.current.style.transform = `translateX(${el.offsetLeft}px)`;
  }, [current]);

  const setActive = useCallback((index: number) => {
    if (index < 0 || index >= variants.length) return;
    setCurrent(index);
    setMountKey((key) => key + 1);
    writeParams({ v: String(index + 1) });
    window.scrollTo({ top: 0 });
  }, []);

  const setScreen = useCallback((next: Screen) => {
    setScreenState(next);
    writeParams({ screen: next });
    window.scrollTo({ top: 0 });
  }, []);

  const replay = useCallback(() => setMountKey((key) => key + 1), []);

  useLayoutEffect(() => moveHighlight(), [moveHighlight]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    const query = window.matchMedia("(max-width: 767px)");
    const onChange = () => setNarrow(query.matches);
    query.addEventListener("change", onChange);
    window.addEventListener("resize", moveHighlight);
    return () => {
      cancelAnimationFrame(frame);
      query.removeEventListener("change", onChange);
      window.removeEventListener("resize", moveHighlight);
    };
  }, [moveHighlight]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"], [role="menu"]')) return;
      const number = Number.parseInt(event.key, 10);
      if (number >= 1 && number <= variants.length) setActive(number - 1);
      else if (event.key === "ArrowRight") setActive((current + 1) % variants.length);
      else if (event.key === "ArrowLeft") setActive((current - 1 + variants.length) % variants.length);
      else if (event.key === "r" || event.key === "R") replay();
      else if (event.key === "s" || event.key === "S") setScreen(screen === "hotels" ? "today" : "hotels");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, screen, setActive, setScreen, replay]);

  const Variant = variant.Component;

  return (
    <>
      <Variant key={`${mountKey}-${screen}`} screen={screen} onScreen={setScreen} />
      {/* On phones a variant with a tab bar owns the bottom edge, so the picker moves to the top. */}
      <nav
        className="proto-picker"
        aria-label="Prototype variants"
        data-ready={ready ? "" : undefined}
        data-position={narrow && variant.ownsBottomOnPhone ? "top" : undefined}
      >
        <span ref={highlight} className="proto-picker-highlight" aria-hidden="true" />
        {variants.map((entry, index) => (
          <button
            key={entry.name}
            ref={(el) => {
              items.current[index] = el;
            }}
            type="button"
            className="proto-picker-item"
            data-active={index === current ? "" : undefined}
            aria-current={index === current ? "true" : undefined}
            onClick={() => setActive(index)}
          >
            {entry.name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button type="button" className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={replay}>
          ↻
        </button>
      </nav>
    </>
  );
}
