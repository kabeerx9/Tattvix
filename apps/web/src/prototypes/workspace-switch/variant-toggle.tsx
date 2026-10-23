// A · Toggle. Airbnb's model: two worlds, one text button that flips between
// them ("Switch to hosting" / "Switch to travelling"). Inside hosting, a
// property picker sits where the logo's neighbour would be. Platform admin is
// a quiet third link for the few who have it.
import { cn } from "@tattvix/ui/lib/utils";
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

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
import type { SwitchModel } from "./model";

function useToggle(model: SwitchModel) {
  const hosting = model.current.mode === "hotel";
  const target = hosting ? model.contexts[0]! : model.lastHotel;
  return {
    hosting,
    label: hosting ? "Switch to travelling" : "Switch to hosting",
    available: model.hotels.length > 0,
    flip: () => target && model.switchTo(target.key),
  };
}

function ToggleButton({ model, className }: { model: SwitchModel; className?: string }) {
  const toggle = useToggle(model);
  if (!toggle.available) return <ListYourHotel model={model} className={className} />;
  return (
    <button
      type="button"
      onClick={toggle.flip}
      className={cn(
        "press h-10 shrink-0 rounded-full px-3 text-sm font-semibold whitespace-nowrap outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {toggle.label}
    </button>
  );
}

function AdminLink({ model, className }: { model: SwitchModel; className?: string }) {
  if (!model.canPlatform) return null;
  const inAdmin = model.current.mode === "platform";
  return (
    <button
      type="button"
      onClick={() => model.switchTo(inAdmin ? "personal" : "platform")}
      className={cn(
        "press h-10 shrink-0 rounded-full px-3 text-sm whitespace-nowrap text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {inAdmin ? "Leave admin" : "Admin"}
    </button>
  );
}

/** Thumb + property name. A picker only when there is more than one property to pick. */
function PropertyTrigger({ model, onOpen, open, compact }: { model: SwitchModel; onOpen: () => void; open: boolean; compact?: boolean }) {
  const current = model.current;
  if (current.mode !== "hotel") return null;
  const many = model.hotels.length > 1;
  const body = (
    <>
      <ContextThumb context={current} name={model.name} className={compact ? "size-8" : "size-9"} />
      <span className="min-w-0 text-left">
        <span className="block truncate text-[15px] leading-tight font-semibold">{current.label}</span>
        {!compact ? <span className="block truncate text-xs text-muted-foreground">{current.detail || current.role}</span> : null}
      </span>
      {many ? <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-(--duration-press)", open && "rotate-180")} aria-hidden /> : null}
    </>
  );
  const shared = "flex min-w-0 items-center gap-2.5 rounded-full py-1 pr-3 pl-1";
  if (!many) return <div className={shared}>{body}</div>;
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`Property: ${current.label}. Change property`}
      onClick={onOpen}
      className={cn(shared, "press max-w-full outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring")}
    >
      {body}
    </button>
  );
}

export function ToggleVariant({ model }: { model: SwitchModel }) {
  const [picker, setPicker] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [menu, setMenu] = useState(false);
  const hosting = model.current.mode === "hotel";

  return (
    <div className="min-h-dvh bg-background text-foreground [--ws-cue-top:140px] xl:[--ws-cue-top:92px]">
      <DesktopHeader>
        <div className="mx-auto flex h-20 max-w-[1400px] items-center gap-4 px-8">
          <BrandLogo size="md" className="shrink-0" />
          {hosting ? (
            <>
              <span aria-hidden className="h-8 w-px shrink-0 bg-border" />
              <Popover
                open={picker}
                onClose={() => setPicker(false)}
                trigger={<PropertyTrigger model={model} open={picker} onOpen={() => setPicker((value) => !value)} />}
              >
                <ContextList model={model} scope="hotels" autoFocus onPicked={() => setPicker(false)} />
              </Popover>
            </>
          ) : null}
          <TopLinks model={model} className="mx-auto hidden min-w-0 xl:flex" />
          <div className="ml-auto flex shrink-0 items-center gap-1 xl:ml-0">
            <AdminLink model={model} />
            <ToggleButton model={model} />
            <span className="w-1" />
            <AccountMenu model={model} />
          </div>
        </div>
        {/* Below xl the section links drop to their own row so the switch never gets squeezed. */}
        <div className="mx-auto flex h-12 max-w-[1400px] items-center px-5 xl:hidden">
          <TopLinks model={model} className="min-w-0" />
        </div>
      </DesktopHeader>

      <PhoneHeader>
        <div className="flex h-14 items-center gap-1 px-3">
          <div className="min-w-0 flex-1">
            {hosting ? (
              <PropertyTrigger model={model} compact open={sheet} onOpen={() => setSheet(true)} />
            ) : (
              <BrandLogo size="sm" className="pl-1" />
            )}
          </div>
          <AdminLink model={model} className="px-2" />
          <ToggleButton model={model} className="px-2.5" />
        </div>
      </PhoneHeader>

      <Main model={model} />

      <PhoneTabBar label="Sections" items={navTabs(model, () => setMenu(true), menu)} />
      <MenuSheet model={model} open={menu} onOpenChange={setMenu} />
      {/* The phone property picker: a sheet, because a popover can't hold 11 hotels with search at 390px. */}
      <BottomSheet open={sheet && hosting} onOpenChange={setSheet} title="Your properties">
        <ContextList model={model} scope="hotels" autoFocus onPicked={() => setSheet(false)} />
      </BottomSheet>
      <ContextCue model={model} />
    </div>
  );
}
