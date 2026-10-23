// B · Context pill. One switcher for everything (Slack/Linear/Vercel model):
// the current place is a big pill at the far left (picture + name), and it
// opens one searchable list: you (Personal, Platform), recents, then every
// hotel grouped by organization. ⌘K opens it from anywhere. On phones the
// first tab is the current place's picture and opens the same list as a sheet.
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
import { cn } from "@tattvix/ui/lib/utils";
import { ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLogo, BrandMark } from "@/components/brand";

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
  type TabItem,
} from "./chrome";
import type { SwitchModel } from "./model";

function detailFor(model: SwitchModel) {
  const current = model.current;
  if (current.mode === "hotel") return current.organization.name === current.label ? current.city : current.organization.name;
  return current.mode === "personal" ? "Personal" : "Every hotel on Tattwix";
}

function ContextPill({ model, open, onToggle }: { model: SwitchModel; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`Current: ${model.current.label}. Switch (⌘K)`}
      onClick={onToggle}
      className={cn(
        "press flex h-12 max-w-[300px] min-w-0 items-center gap-2.5 rounded-full border border-border py-1 pr-3 pl-1.5 outline-none hover:shadow-raised focus-visible:ring-2 focus-visible:ring-ring lg:max-w-[340px]",
        open && "shadow-raised",
      )}
    >
      <ContextThumb context={model.current} name={model.name} className="size-9 rounded-full" />
      <span className="min-w-0 text-left">
        <span className="block truncate text-[15px] leading-tight font-semibold">
          {model.current.mode === "personal" ? model.name : model.current.label}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{detailFor(model)}</span>
      </span>
      <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}

export function PillVariant({ model }: { model: SwitchModel }) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [menu, setMenu] = useState(false);
  const switcher = model.contexts.length > 1;

  // ⌘K / Ctrl+K: the switcher from anywhere. Desktop opens the popover, phones the sheet.
  useEffect(() => {
    if (!switcher) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (window.matchMedia("(min-width: 768px)").matches) setOpen((value) => !value);
        else setSheet(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [switcher]);

  // Phones: the place tab replaces one section tab; the dropped section moves to Menu.
  const sections = navTabs(model, () => setMenu(true), menu);
  const keep = switcher ? 3 : 4;
  const tabs: TabItem[] = switcher
    ? [
        {
          key: "place",
          label: model.current.mode === "personal" ? "Personal" : model.current.mode === "platform" ? "Admin" : model.current.label,
          ariaLabel: `Switch from ${model.current.label}`,
          icon: <ContextThumb context={model.current} name={model.name} className="size-6 rounded-md text-[9px]" />,
          isActive: sheet,
          onClick: () => setSheet(true),
        },
        ...sections.slice(0, Math.min(keep, sections.length - 1)),
        sections[sections.length - 1]!,
      ]
    : sections;
  const dropped = model.nav.tabs.slice(Math.min(keep, sections.length - 1));
  const overflow = switcher ? [...dropped, ...model.nav.overflow] : model.nav.overflow;
  if (switcher && dropped.some((item) => item.isActive)) tabs[tabs.length - 1] = { ...tabs[tabs.length - 1]!, isActive: true };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <DesktopHeader>
        <div className="mx-auto flex h-20 max-w-[1400px] items-center gap-3 px-8">
          {switcher ? (
            <>
              <BrandMark className="size-7 shrink-0" />
              <Popover
                open={open}
                onClose={() => setOpen(false)}
                trigger={<ContextPill model={model} open={open} onToggle={() => setOpen((value) => !value)} />}
              >
                <ContextList model={model} autoFocus onPicked={() => setOpen(false)} />
                <p className="mt-2 border-t border-border-soft px-2 pt-2.5 text-xs text-subtle-foreground">
                  <kbd className="font-sans">↑↓</kbd> to move · <kbd className="font-sans">↵</kbd> to open · <kbd className="font-sans">⌘K</kbd> from anywhere
                </p>
              </Popover>
            </>
          ) : (
            <BrandLogo size="md" className="shrink-0" />
          )}
          <TopLinks model={model} className="mx-auto min-w-0" />
          <div className="flex shrink-0 items-center gap-2">
            {!switcher ? <ListYourHotel model={model} /> : null}
            <AccountMenu model={model} />
          </div>
        </div>
      </DesktopHeader>

      <PhoneHeader>
        <div className="flex h-14 items-center gap-2 px-3">
          {switcher ? (
            <button
              type="button"
              onClick={() => setSheet(true)}
              aria-label={`Current: ${model.current.label}. Switch`}
              className="press flex min-w-0 items-center gap-2 rounded-full py-1 pr-3 pl-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ContextThumb context={model.current} name={model.name} className="size-8 rounded-full" />
              <span className="truncate text-[15px] font-semibold">{model.current.mode === "personal" ? model.name : model.current.label}</span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          ) : (
            <>
              <BrandLogo size="sm" className="pl-1" />
              <span className="flex-1" />
              <ListYourHotel model={model} />
            </>
          )}
        </div>
      </PhoneHeader>

      <Main model={model} />

      <PhoneTabBar label="Sections" items={tabs} />
      <MenuSheet model={model} open={menu} onOpenChange={setMenu} overflow={overflow} />
      <BottomSheet open={sheet} onOpenChange={setSheet} title="Switch to">
        <ContextList model={model} autoFocus onPicked={() => setSheet(false)} />
      </BottomSheet>
      <ContextCue model={model} />
    </div>
  );
}
