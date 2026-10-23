// C · Modes. Mode first, place second: a segmented "Stay · Host · Admin"
// control is the top of every screen (only the modes the account has), and
// the property switcher exists only inside Host. Two short decisions instead
// of one long list.
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
import { cn } from "@tattvix/ui/lib/utils";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand";

import {
  AccountMenu,
  ContextCue,
  ContextList,
  ContextThumb,
  DesktopHeader,
  ListYourHotel,
  Main,
  MenuSheet,
  PhoneHeader,
  PhoneTabBar,
  Popover,
  TopLinks,
  navTabs,
} from "./chrome";
import type { Mode, SwitchModel } from "./model";

const modeLabels: Record<Mode, string> = { personal: "Stay", hotel: "Host", platform: "Admin" };

function useModes(model: SwitchModel) {
  const modes: Mode[] = ["personal"];
  if (model.hotels.length) modes.push("hotel");
  if (model.canPlatform) modes.push("platform");
  const go = (mode: Mode) => {
    if (mode === model.current.mode) return;
    if (mode === "hotel") model.lastHotel && model.switchTo(model.lastHotel.key);
    else model.switchTo(mode);
  };
  return { modes, go };
}

/** Equal segments, one neutral thumb that slides (transform only). Arrow keys move between modes. */
function ModeControl({ model, className }: { model: SwitchModel; className?: string }) {
  const { modes, go } = useModes(model);
  const index = modes.indexOf(model.current.mode);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    event.stopPropagation();
    const next = modes[(index + (event.key === "ArrowRight" ? 1 : -1) + modes.length) % modes.length]!;
    go(next);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-mode="${next}"]`)?.focus());
  }

  return (
    <div
      role="radiogroup"
      aria-label="Mode"
      onKeyDown={onKeyDown}
      className={cn("relative grid h-11 rounded-full bg-muted p-1", className)}
      style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="ws-thumb pointer-events-none absolute inset-y-1 left-1 rounded-full bg-background shadow-card"
        data-instant={settled ? undefined : ""}
        style={{ width: `calc((100% - 8px) / ${modes.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {modes.map((mode) => {
        const active = mode === model.current.mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            data-mode={mode}
            onClick={() => go(mode)}
            className={cn(
              "relative z-10 rounded-full px-4 text-sm whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {modeLabels[mode]}
          </button>
        );
      })}
    </div>
  );
}

function PropertyChip({ model, open, onOpen, wide }: { model: SwitchModel; open: boolean; onOpen: () => void; wide?: boolean }) {
  const current = model.current;
  if (current.mode !== "hotel") return null;
  const many = model.hotels.length > 1;
  const body = (
    <>
      <ContextThumb context={current} name={model.name} className="size-7 rounded-md" />
      <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold">{current.label}</span>
      {wide && current.city ? <span className="shrink-0 text-sm text-muted-foreground">{current.city}</span> : null}
      {many ? <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-(--duration-press)", open && "rotate-180")} aria-hidden /> : null}
    </>
  );
  const shared = cn("flex h-10 min-w-0 items-center gap-2 rounded-full border border-border py-1 pr-3 pl-1.5", wide ? "w-full" : "max-w-[280px]");
  if (!many) return <div className={shared}>{body}</div>;
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`Property: ${current.label}. Change property`}
      onClick={onOpen}
      className={cn(shared, "press outline-none hover:shadow-raised focus-visible:ring-2 focus-visible:ring-ring")}
    >
      {body}
    </button>
  );
}

export function ModesVariant({ model }: { model: SwitchModel }) {
  const [picker, setPicker] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [menu, setMenu] = useState(false);
  const { modes } = useModes(model);
  const hosting = model.current.mode === "hotel";
  const hasModes = modes.length > 1;

  return (
    <div
      className="min-h-dvh bg-background text-foreground"
      style={{ "--ws-cue-top": "140px", "--ws-cue-top-phone": hosting ? "124px" : hasModes ? "74px" : "68px" } as React.CSSProperties}
    >
      <DesktopHeader>
        <div className="mx-auto grid h-18 max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-8">
          <BrandLogo size="md" className="justify-self-start" />
          {hasModes ? <ModeControl model={model} className="w-[300px]" /> : <span />}
          <div className="flex items-center gap-2 justify-self-end">
            {!hasModes ? <ListYourHotel model={model} /> : null}
            <AccountMenu model={model} />
          </div>
        </div>
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-8">
          {hosting ? (
            <>
              <Popover
                open={picker}
                onClose={() => setPicker(false)}
                trigger={<PropertyChip model={model} open={picker} onOpen={() => setPicker((value) => !value)} />}
              >
                <ContextList model={model} scope="hotels" autoFocus onPicked={() => setPicker(false)} />
              </Popover>
              <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
            </>
          ) : null}
          <TopLinks model={model} className="min-w-0 -ml-3" />
        </div>
      </DesktopHeader>

      <PhoneHeader>
        {hasModes ? (
          <div className="grid gap-2 px-4 pt-2 pb-2.5">
            <ModeControl model={model} />
            {hosting ? <PropertyChip model={model} wide open={sheet} onOpen={() => setSheet(true)} /> : null}
          </div>
        ) : (
          <div className="flex h-14 items-center px-3">
            <BrandLogo size="sm" className="pl-1" />
            <span className="flex-1" />
            <ListYourHotel model={model} />
          </div>
        )}
      </PhoneHeader>

      <Main model={model} />

      <PhoneTabBar label="Sections" items={navTabs(model, () => setMenu(true), menu)} />
      <MenuSheet model={model} open={menu} onOpenChange={setMenu} />
      <BottomSheet open={sheet && hosting} onOpenChange={setSheet} title="Your properties">
        <ContextList model={model} scope="hotels" autoFocus onPicked={() => setSheet(false)} />
      </BottomSheet>
      <ContextCue model={model} />
    </div>
  );
}
