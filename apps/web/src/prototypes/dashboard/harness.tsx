// Picker harness (spec: ~/.claude/skills/prototype/PICKER.md). Renders one
// variant at a time, full page; 1-3 / arrows switch, R replays.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import "./prototype.css";
import { InsightsVariant } from "./variant-insights";
import { RoomsVariant } from "./variant-rooms";
import { TodayVariant } from "./variant-today";

const variants = [
  { name: "Today", Component: TodayVariant },
  { name: "Rooms", Component: RoomsVariant },
  { name: "Insights", Component: InsightsVariant },
];

function initialIndex() {
  const value = Number.parseInt(new URLSearchParams(window.location.search).get("v") ?? "", 10);
  return value >= 1 && value <= variants.length ? value - 1 : 0;
}

/** Mobile-native page setup while the prototype is mounted. */
function useNativeViewport() {
  useEffect(() => {
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const previous = viewport?.content;
    if (viewport) viewport.content = "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content";
    const theme = document.createElement("meta");
    theme.name = "theme-color";
    theme.content = "#ffffff";
    document.head.appendChild(theme);
    return () => {
      if (viewport && previous) viewport.content = previous;
      theme.remove();
    };
  }, []);
}

export function DashboardPrototypes() {
  useNativeViewport();
  const [current, setCurrent] = useState(initialIndex);
  const [mountKey, setMountKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const highlight = useRef<HTMLSpanElement>(null);

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
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(index + 1));
    window.history.replaceState(window.history.state, "", url);
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
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const number = Number.parseInt(event.key, 10);
      if (number >= 1 && number <= variants.length) setActive(number - 1);
      else if (event.key === "ArrowRight") setActive((current + 1) % variants.length);
      else if (event.key === "ArrowLeft") setActive((current - 1 + variants.length) % variants.length);
      else if (event.key === "r" || event.key === "R") replay();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, setActive, replay]);

  const Variant = variants[current]!.Component;

  return (
    <>
      <Variant key={mountKey} />
      {/* Mobile variants own the bottom edge (tab bar), so the picker moves to the top there. */}
      <nav
        className="proto-picker"
        aria-label="Prototype variants"
        data-ready={ready ? "" : undefined}
        data-position={narrow ? "top" : undefined}
      >
        <span ref={highlight} className="proto-picker-highlight" aria-hidden="true" />
        {variants.map((variant, index) => (
          <button
            key={variant.name}
            ref={(el) => {
              items.current[index] = el;
            }}
            type="button"
            className="proto-picker-item"
            data-active={index === current ? "" : undefined}
            aria-current={index === current ? "true" : undefined}
            onClick={() => setActive(index)}
          >
            {variant.name}
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
