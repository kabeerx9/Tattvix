// The variant picker from the prototype skill's PICKER.md: same markup,
// classes and behaviour contract, expressed as a React component.

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import "./picker.css";

export function Picker({
  names,
  current,
  onSelect,
  onReplay,
  position,
}: {
  names: string[];
  current: number;
  onSelect: (index: number) => void;
  onReplay?: () => void;
  position?: "top";
}) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [highlight, setHighlight] = useState({ width: 0, x: 0 });
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    function measure() {
      const el = itemRefs.current[current];
      if (el) setHighlight({ width: el.offsetWidth, x: el.offsetLeft });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [current]);

  // Enable the slide only after first paint, so load doesn't animate.
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const num = Number.parseInt(e.key, 10);
      if (num >= 1 && num <= names.length) onSelect(num - 1);
      else if (e.key === "ArrowRight") onSelect((current + 1) % names.length);
      else if (e.key === "ArrowLeft") onSelect((current - 1 + names.length) % names.length);
      else if ((e.key === "r" || e.key === "R") && onReplay) onReplay();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [current, names.length, onSelect, onReplay]);

  return (
    <nav
      className="proto-picker"
      aria-label="Prototype variants"
      data-ready={ready || undefined}
      data-position={position}
    >
      <span
        className="proto-picker-highlight"
        aria-hidden="true"
        style={{ width: highlight.width, transform: `translateX(${highlight.x}px)` }}
      />
      {names.map((name, i) => (
        <button
          key={name}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          type="button"
          className="proto-picker-item"
          data-active={i === current || undefined}
          aria-current={i === current ? "true" : undefined}
          onClick={() => onSelect(i)}
        >
          {name}
        </button>
      ))}
      {onReplay ? (
        <>
          <span className="proto-picker-divider" aria-hidden="true" />
          <button
            type="button"
            className="proto-picker-item proto-picker-replay"
            aria-label="Replay animation (R)"
            onClick={onReplay}
          >
            ↻
          </button>
        </>
      ) : null}
    </nav>
  );
}
