// Picker harness (spec: ~/.claude/skills/prototype/PICKER.md). One switching
// model at a time, full page. 1-3 / arrows switch variant, R replays,
// D cycles the account (data case); the bottom-left control does the same.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import "./prototype.css";
import { dataCases, type DataCase } from "./data";
import { useWorkspaceSwitch, type SwitchModel } from "./model";
import { ModesVariant } from "./variant-modes";
import { PillVariant } from "./variant-pill";
import { ToggleVariant } from "./variant-toggle";

const variants: { name: string; Component: (props: { model: SwitchModel }) => React.ReactNode }[] = [
  { name: "Toggle", Component: ToggleVariant },
  { name: "Context pill", Component: PillVariant },
  { name: "Modes", Component: ModesVariant },
];

function initialIndex() {
  const value = Number.parseInt(new URLSearchParams(window.location.search).get("v") ?? "", 10);
  return value >= 1 && value <= variants.length ? value - 1 : 0;
}

function initialCase(): DataCase {
  const value = new URLSearchParams(window.location.search).get("case");
  return dataCases.find((item) => item.key === value)?.key ?? "two-orgs";
}

function writeParams(params: Record<string, string>) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  window.history.replaceState(window.history.state, "", url);
}

function Stage({ index, caseKey }: { index: number; caseKey: DataCase }) {
  const user = dataCases.find((item) => item.key === caseKey)!.user;
  const model = useWorkspaceSwitch(user);
  const Variant = variants[index]!.Component;
  return <Variant model={model} />;
}

export function WorkspaceSwitchPrototypes() {
  const [current, setCurrent] = useState(initialIndex);
  const [caseKey, setCaseKey] = useState<DataCase>(initialCase);
  const [mountKey, setMountKey] = useState(0);
  const [ready, setReady] = useState(false);
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
    writeParams({ v: String(index + 1) });
    window.scrollTo({ top: 0 });
  }, []);

  const setCase = useCallback((next: DataCase) => {
    setCaseKey(next);
    writeParams({ case: next });
    window.scrollTo({ top: 0 });
  }, []);

  const replay = useCallback(() => setMountKey((key) => key + 1), []);

  useLayoutEffect(() => moveHighlight(), [moveHighlight]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    window.addEventListener("resize", moveHighlight);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", moveHighlight);
    };
  }, [moveHighlight]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector('[role="dialog"], [role="menu"]')) return;
      const number = Number.parseInt(event.key, 10);
      if (number >= 1 && number <= variants.length) setActive(number - 1);
      else if (event.key === "ArrowRight") setActive((current + 1) % variants.length);
      else if (event.key === "ArrowLeft") setActive((current - 1 + variants.length) % variants.length);
      else if (event.key === "r" || event.key === "R") replay();
      else if (event.key === "d" || event.key === "D") {
        const at = dataCases.findIndex((item) => item.key === caseKey);
        setCase(dataCases[(at + (event.shiftKey ? -1 : 1) + dataCases.length) % dataCases.length]!.key);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, caseKey, setActive, setCase, replay]);

  return (
    <>
      <Stage key={`${mountKey}-${caseKey}`} index={current} caseKey={caseKey} />
      {/* Every variant owns both phone edges (header and tab bar), so on phones the picker floats just above the tab bar. */}
      <nav className="proto-picker" aria-label="Prototype variants" data-ready={ready ? "" : undefined}>
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
      <label className="ws-case">
        <span>Account (D)</span>
        <select value={caseKey} onChange={(event) => setCase(event.target.value as DataCase)} aria-label="Account type">
          {dataCases.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
