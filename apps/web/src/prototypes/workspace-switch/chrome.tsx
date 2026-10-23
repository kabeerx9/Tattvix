// Pieces every variant shares: the Host top-nav links, account menu, phone
// tab bar, Menu sheet, the searchable context list and the home screens.
// Built from production components and tokens (no tinted icon tiles,
// neutral icons, accent only on indicators, links and the primary action).
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
import { Button } from "@tattvix/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tattvix/ui/components/dropdown-menu";
import { useActiveIndicator } from "@tattvix/ui/hooks/use-active-indicator";
import { cn } from "@tattvix/ui/lib/utils";
import {
  BarChart3,
  BedDouble,
  Building2,
  CalendarCheck,
  Check,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Contact,
  IdCard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { BrandMark } from "@/components/brand";
import { Kpi, KpiStrip, ListRow, Panel, PanelHeader, StatusPill } from "@/components/design-system";
import { getInitials } from "@/lib/initials";

import { arrivalsFor, myStays, photos, statsFor } from "./data";
import { groupHotels, matchesQuery, type Context, type HotelContext, type NavEntry, type SwitchModel } from "./model";

export const navIcons: Record<string, LucideIcon> = {
  overview: Contact,
  stays: ClipboardList,
  rooms: BedDouble,
  guests: Users,
  reports: BarChart3,
  settings: Settings,
  profile: IdCard,
  companions: UsersRound,
  privacy: ShieldCheck,
  register: Building2,
  hotels: Building2,
  requests: ClipboardCheck,
};
export const hotelHomeIcon = CalendarCheck;

export function iconFor(entry: NavEntry, model: SwitchModel) {
  if (model.current.mode === "hotel" && entry.key === "overview") return hotelHomeIcon;
  return navIcons[entry.key] ?? Contact;
}

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

export function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background", className)}
    >
      {getInitials(name)}
    </span>
  );
}

/** The picture of a context: hotel cover (or its initials), the person, or the Tattwix mark. */
export function ContextThumb({ context, name, className }: { context: Context; name: string; className?: string }) {
  if (context.mode === "hotel") {
    return context.photo ? (
      <img src={context.photo} alt="" className={cn("size-8 shrink-0 rounded-lg object-cover", className)} />
    ) : (
      <span
        aria-hidden
        className={cn("grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-[11px] font-semibold text-muted-foreground", className)}
      >
        {getInitials(context.label)}
      </span>
    );
  }
  if (context.mode === "personal") return <UserAvatar name={name} className={cn("rounded-full", className)} />;
  return (
    <span aria-hidden className={cn("grid size-8 shrink-0 place-items-center text-foreground", className)}>
      <BrandMark className="size-[60%]" />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop nav                                                         */
/* ------------------------------------------------------------------ */

export function TopLinks({ model, className }: { model: SwitchModel; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const active = model.nav.items.find((item) => item.isActive)?.key;
  const indicator = useActiveIndicator(ref, '[aria-current="page"] [data-nav-label]', `${model.current.key}:${active}`);
  return (
    <nav ref={ref} aria-label="Sections" className={cn("relative flex h-full items-center gap-0.5 lg:gap-1", className)}>
      {model.nav.items.map((item) => (
        <button
          key={item.key}
          type="button"
          aria-current={item.isActive ? "page" : undefined}
          onClick={() => model.navigate(item.path)}
          className={cn(
            "press flex h-11 items-center rounded-full px-3 text-sm whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring lg:px-4 lg:text-[15px]",
            item.isActive ? "font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <span data-nav-label>{item.shortLabel}</span>
        </button>
      ))}
      {indicator ? (
        <span
          aria-hidden
          className="nav-indicator pointer-events-none absolute bottom-0 left-0 h-[3px] w-px bg-primary"
          data-instant={indicator.instant ? "" : undefined}
          style={{ transform: `translateX(${indicator.left}px) scaleX(${indicator.width})` }}
        />
      ) : null}
    </nav>
  );
}

/** Account only: settings and sign out. Switching lives in each variant's own control. */
export function AccountMenu({ model }: { model: SwitchModel }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account"
        className="press flex h-11 items-center gap-2 rounded-full border border-border pr-1.5 pl-3 outline-none hover:shadow-raised focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu className="size-4" aria-hidden />
        <UserAvatar name={model.name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onClick={() => model.notBuilt("Account settings")}>
          <Settings className="size-4" />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => model.notBuilt("Sign out")}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Guest-only accounts get no switcher, just this quiet way in. */
export function ListYourHotel({ model, className }: { model: SwitchModel; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => model.navigate("/register-hotel")}
      className={cn(
        "press h-10 rounded-full px-3 text-sm font-medium whitespace-nowrap outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      List your hotel
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Phone tab bar and Menu                                              */
/* ------------------------------------------------------------------ */

export type TabItem = { key: string; label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void; ariaLabel?: string };

/** Same grammar as the production BottomTabBar, but a tab may carry a picture (a hotel cover) instead of an icon. */
export function PhoneTabBar({ items, label }: { items: TabItem[]; label: string }) {
  const activeIndex = items.findIndex((item) => item.isActive);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <nav
      aria-label={label}
      data-bottom-tab-bar=""
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] backdrop-blur md:hidden"
    >
      <div className="relative mx-auto max-w-md">
        {activeIndex >= 0 ? (
          <span
            aria-hidden
            className="nav-indicator pointer-events-none absolute top-0 left-0 flex justify-center"
            data-instant={settled ? undefined : ""}
            style={{ width: `${100 / items.length}%`, transform: `translateX(${activeIndex * 100}%)` }}
          >
            <span className="h-[3px] w-8 rounded-b-full bg-primary" />
          </span>
        ) : null}
        <ul className="grid h-(--tab-bar-height)" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((item) => (
            <li key={item.key} className="grid min-w-0">
              <button
                type="button"
                onClick={item.onClick}
                aria-label={item.ariaLabel}
                aria-current={item.isActive ? "page" : undefined}
                className={cn(
                  "press grid h-full place-content-center justify-items-center gap-1 text-[11px] outline-none focus-visible:bg-muted",
                  item.isActive ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {item.icon}
                <span className="max-w-full truncate px-1">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export function navTabs(model: SwitchModel, onMenu: () => void, menuOpen: boolean): TabItem[] {
  return [
    ...model.nav.tabs.map((item) => {
      const Icon = iconFor(item, model);
      return {
        key: item.key,
        label: item.shortLabel,
        icon: <Icon aria-hidden className="size-6" strokeWidth={item.isActive ? 2.1 : 1.6} />,
        isActive: item.isActive,
        onClick: () => model.navigate(item.path),
      };
    }),
    {
      key: "menu",
      label: "Menu",
      icon: <Menu aria-hidden className="size-6" strokeWidth={menuOpen || model.nav.menuActive ? 2.1 : 1.6} />,
      isActive: menuOpen || model.nav.menuActive,
      onClick: onMenu,
    },
  ];
}

export function MenuRow({
  leading,
  label,
  detail,
  active,
  onClick,
}: {
  leading?: React.ReactNode;
  label: string;
  detail?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button type="button" onClick={onClick} className="press flex min-h-14 w-full items-center gap-3 py-2 text-left outline-none focus-visible:bg-muted">
        {leading}
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[15px]", active && "font-semibold")}>{label}</span>
          {detail ? <span className="block truncate text-sm text-muted-foreground">{detail}</span> : null}
        </span>
        {active ? <Check className="size-4 shrink-0 text-foreground" aria-label="Current" /> : <ChevronRight className="size-4 shrink-0 text-subtle-foreground" aria-hidden />}
      </button>
    </li>
  );
}

/** Pages without a tab plus account. `children` lets a variant add its own rows. */
export function MenuSheet({
  model,
  open,
  onOpenChange,
  children,
  overflow = model.nav.overflow,
}: {
  model: SwitchModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
  overflow?: NavEntry[];
}) {
  const go = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Menu">
      <div className="grid gap-6">
        {children}
        {overflow.length ? (
          <ul className="divide-y divide-border-soft border-y border-border-soft">
            {overflow.map((item) => {
              const Icon = iconFor(item, model);
              return (
                <MenuRow
                  key={item.key}
                  leading={<Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
                  label={item.label}
                  active={item.isActive}
                  onClick={() => go(() => model.navigate(item.path))}
                />
              );
            })}
          </ul>
        ) : null}
        <section>
          <h3 className="mb-1 text-xs text-subtle-foreground">Account</h3>
          <ul className="divide-y divide-border-soft">
            <MenuRow
              leading={<Settings className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
              label="Account settings"
              detail={model.name}
              onClick={() => go(() => model.notBuilt("Account settings"))}
            />
            <MenuRow leading={<LogOut className="size-5 shrink-0 text-muted-foreground" aria-hidden />} label="Sign out" onClick={() => go(() => model.notBuilt("Sign out"))} />
          </ul>
        </section>
      </div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Context list (search, recents, grouped by organization)             */
/* ------------------------------------------------------------------ */

/** Search appears once a list is long enough to need it. */
export const SEARCH_THRESHOLD = 7;

function ContextRow({
  context,
  model,
  active,
  highlighted,
  onPick,
  onHover,
}: {
  context: Context;
  model: SwitchModel;
  active: boolean;
  highlighted: boolean;
  onPick: () => void;
  onHover: () => void;
}) {
  return (
    <li role="option" aria-selected={active} data-highlighted={highlighted ? "" : undefined}>
      <button
        type="button"
        tabIndex={-1}
        onClick={onPick}
        onPointerMove={onHover}
        className={cn(
          "flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-none md:min-h-12",
          highlighted && "bg-muted",
        )}
      >
        <ContextThumb context={context} name={model.name} className="size-10 md:size-9" />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[15px] md:text-sm", active ? "font-semibold" : "font-medium")}>{context.label}</span>
          <span className="block truncate text-[13px] text-muted-foreground md:text-xs">
            {context.mode === "hotel" ? [context.city, context.role].filter(Boolean).join(" · ") : context.detail}
          </span>
        </span>
        {active ? <Check className="size-4 shrink-0 text-foreground" aria-label="Current" /> : null}
      </button>
    </li>
  );
}

/**
 * The full switcher list. `scope="hotels"` lists properties only (for a
 * property picker inside hosting mode). Arrow keys move, Enter opens.
 */
export function ContextList({
  model,
  onPicked,
  scope = "all",
  autoFocus = false,
  showRecents = true,
}: {
  model: SwitchModel;
  onPicked: () => void;
  scope?: "all" | "hotels";
  autoFocus?: boolean;
  showRecents?: boolean;
}) {
  const [query, setQuery] = useState("");
  const pool = scope === "hotels" ? model.hotels : model.contexts;
  const needsSearch = pool.length >= SEARCH_THRESHOLD;
  const searching = query.trim().length > 0;

  const sections = useMemo(() => {
    const matching = pool.filter((context) => matchesQuery(context, query));
    const out: { title: string | null; items: Context[] }[] = [];
    if (scope === "all") {
      const you = matching.filter((item) => item.mode !== "hotel");
      if (you.length) out.push({ title: null, items: you });
    }
    const recent = model.recents.filter((item) => item.mode === "hotel" && matchesQuery(item, query));
    if (showRecents && !searching && recent.length && pool.length >= SEARCH_THRESHOLD) out.push({ title: "Recent", items: recent });
    for (const group of groupHotels(matching)) {
      out.push({ title: groupHotels(pool).length > 1 || scope === "all" ? group.organization.name : null, items: group.hotels });
    }
    return out;
  }, [pool, query, scope, model.recents, showRecents, searching]);

  const flat = sections.flatMap((section) => section.items);
  const [highlight, setHighlight] = useState(() => Math.max(0, flat.findIndex((item) => item.key === model.current.key)));
  useEffect(() => setHighlight((value) => Math.min(value, Math.max(0, flat.length - 1))), [flat.length]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    // Phones get the list first (the keyboard would cover it); desktop types straight away.
    if (needsSearch && window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
    else listRef.current?.focus();
  }, [autoFocus, needsSearch]);

  useEffect(() => {
    listRef.current?.querySelector("[data-highlighted]")?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const pick = (context: Context) => {
    onPicked();
    model.switchTo(context.key);
  };

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlight((value) => (value + step + flat.length) % Math.max(flat.length, 1));
    } else if (event.key === "Enter" && flat[highlight]) {
      event.preventDefault();
      pick(flat[highlight]!);
    }
  }

  let index = -1;
  return (
    <div className="grid gap-2" onKeyDown={onKeyDown}>
      {needsSearch ? (
        <label className="flex h-11 items-center gap-2 rounded-full border border-input px-4 focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlight(0);
            }}
            placeholder={scope === "hotels" ? "Search hotels or cities" : "Search hotels, cities or organizations"}
            aria-label="Search"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-subtle-foreground md:text-sm"
          />
        </label>
      ) : null}
      <div ref={listRef} tabIndex={-1} role="listbox" aria-label="Switch to" className="grid gap-3 outline-none">
        {sections.map((section, sectionIndex) => (
          <section key={`${section.title}-${sectionIndex}`}>
            {section.title ? <h3 className="px-2 pt-1 pb-1 text-xs text-subtle-foreground">{section.title}</h3> : null}
            <ul className="grid">
              {section.items.map((context) => {
                index += 1;
                const at = index;
                return (
                  <ContextRow
                    key={`${section.title}-${context.key}`}
                    context={context}
                    model={model}
                    active={context.key === model.current.key}
                    highlighted={at === highlight}
                    onPick={() => pick(context)}
                    onHover={() => setHighlight(at)}
                  />
                );
              })}
            </ul>
          </section>
        ))}
        {flat.length === 0 ? <p className="px-2 py-6 text-center text-sm text-muted-foreground">No hotel matches “{query}”.</p> : null}
      </div>
    </div>
  );
}

/** Closes a desktop popover on outside press or Escape. */
export function useDismiss(open: boolean, onClose: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, ref]);
}

/** Desktop popover anchored under its trigger; the trigger renders inside so outside-press works. */
export function Popover({
  open,
  onClose,
  trigger,
  children,
  align = "start",
  className,
}: {
  open: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, onClose, ref);
  return (
    <div ref={ref} className="relative">
      {trigger}
      {open ? (
        <div
          role="dialog"
          aria-label="Switch"
          className={cn(
            "ws-pop absolute top-[calc(100%+8px)] z-40 max-h-[min(72vh,620px)] w-[380px] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-popover p-3 shadow-raised",
            align === "end" ? "right-0 origin-top-right" : "left-0",
            className,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** Phone header used by every variant: sticky, safe-area aware, same chrome as production. */
export function PhoneHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border bg-background/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur md:hidden",
        className,
      )}
    >
      {children}
    </header>
  );
}

/** Desktop header shell shared by the variants. */
export function DesktopHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <header className={cn("sticky top-0 z-30 hidden border-b border-border bg-background/95 backdrop-blur md:block", className)}>
      {children}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Cue and pages                                                       */
/* ------------------------------------------------------------------ */

export function ContextCue({ model }: { model: SwitchModel }) {
  if (!model.cue) return null;
  return (
    <div key={model.cue.id} role="status" className="ws-cue pointer-events-none">
      <span className="flex h-9 items-center rounded-full border border-border bg-background px-4 text-sm font-medium whitespace-nowrap shadow-raised">
        {model.cue.label}
      </span>
    </div>
  );
}

function Title({ title, meta }: { title: string; meta?: string }) {
  return (
    <header className="min-w-0">
      <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.03em] wrap-anywhere md:text-[34px]">{title}</h1>
      {meta ? <p className="mt-1.5 text-[15px] text-muted-foreground wrap-anywhere">{meta}</p> : null}
    </header>
  );
}

function HotelToday({ context, model }: { context: HotelContext; model: SwitchModel }) {
  const stats = statsFor(context.property.slug);
  const arrivals = arrivalsFor(context.property.slug);
  return (
    <div className="grid grid-cols-1 gap-6">
      <Title title={`Welcome back, ${model.user.firstName}`} meta={`Friday, 23 October · ${context.label}`} />
      <KpiStrip>
        <Kpi label="Occupied tonight" value={`${stats.occupied} / ${stats.rooms}`} />
        <Kpi label="Arriving" value={stats.arrivals} />
        <Kpi label="Checking out" value={stats.departures} />
      </KpiStrip>
      <Panel>
        <PanelHeader title="Today’s guests" meta={arrivals.length} />
        <ul>
          {arrivals.map((guest) => (
            <li key={guest.name} className="border-t border-border-soft px-5 py-3 first:border-t-0">
              <ListRow
                leading={<UserAvatar name={guest.name} className="bg-muted text-foreground" />}
                title={guest.name}
                meta={guest.detail}
                badge={
                  guest.status === "waiting" ? (
                    <StatusPill tone="warning">Waiting for a room</StatusPill>
                  ) : guest.status === "out" ? (
                    <StatusPill tone="neutral">Checking out</StatusPill>
                  ) : null
                }
              />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function MyStays({ model }: { model: SwitchModel }) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <Title title="My stays" meta={`${model.name} · your bookings and check-ins`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {myStays.map((stay) => (
          <article key={stay.id} className="overflow-hidden rounded-card border border-border bg-card shadow-card">
            <img src={stay.photo} alt="" className="aspect-[16/10] w-full object-cover" />
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="truncate text-[15px] font-semibold">{stay.property}</h2>
                <StatusPill tone={stay.status === "Upcoming" ? "success" : "neutral"}>{stay.status}</StatusPill>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {stay.city} · {stay.dates}
              </p>
            </div>
          </article>
        ))}
      </div>
      <Panel className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-[15px] font-semibold">Checking in somewhere?</h2>
          <p className="text-sm text-muted-foreground">Scan the hotel’s QR at the desk; your ID is ready.</p>
        </div>
        <Button variant="outline" onClick={() => model.notBuilt("Check-in scanner")}>
          Scan a check-in QR
        </Button>
      </Panel>
    </div>
  );
}

function AdminHotels({ model }: { model: SwitchModel }) {
  const all = [
    { name: "Umaid Niwas Haveli", detail: "Rajwada Hospitality · Jaipur", photo: photos.haveli, tonight: "83%" },
    { name: "Lakeview Residency", detail: "Rajwada Hospitality · Udaipur", photo: photos.udaipur, tonight: "78%" },
    { name: "Kumarakom Backwater Retreat", detail: "Malabar Retreats · Kumarakom", photo: photos.kerala, tonight: "64%" },
    { name: "The Ridge, Mall Road", detail: "Himalayan Inns · Shimla", photo: photos.shimla, tonight: "71%" },
  ];
  return (
    <div className="grid grid-cols-1 gap-6">
      <Title title="Hotels" meta="8 properties · 6 organizations" />
      <KpiStrip>
        <Kpi label="Properties" value="8" />
        <Kpi label="Occupancy tonight" value="69%" />
        <Kpi label="In house" value="210" />
      </KpiStrip>
      <Panel>
        <PanelHeader title="Properties" meta={all.length} />
        <ul>
          {all.map((hotel) => (
            <li key={hotel.name} className="border-t border-border-soft px-5 py-3 first:border-t-0">
              <ListRow
                leading={<img src={hotel.photo} alt="" className="size-10 shrink-0 rounded-lg object-cover" />}
                title={hotel.name}
                meta={hotel.detail}
                trailing={hotel.tonight}
              />
            </li>
          ))}
        </ul>
      </Panel>
      <p className="text-sm text-muted-foreground">
        Signed in as {model.name}, platform admin.
      </p>
    </div>
  );
}

function Placeholder({ model }: { model: SwitchModel }) {
  const entry = [...model.nav.items].find((item) => item.isActive);
  const title = model.pathname === "/register-hotel" ? "Register your hotel" : (entry?.label ?? "Page");
  return (
    <div className="grid grid-cols-1 gap-6">
      <Title title={title} meta={model.current.mode === "hotel" ? model.current.label : undefined} />
      <Panel className="p-8 text-center text-sm text-muted-foreground">
        This page isn’t part of the switch prototype. Use the switcher to move between places.
      </Panel>
    </div>
  );
}

export function PageContent({ model }: { model: SwitchModel }) {
  const { current, pathname } = model;
  if (current.mode === "hotel" && pathname.endsWith("/dashboard")) return <HotelToday context={current} model={model} />;
  if (current.mode === "personal" && pathname === "/stays") return <MyStays model={model} />;
  if (current.mode === "platform" && pathname === "/admin") return <AdminHotels model={model} />;
  return <Placeholder model={model} />;
}

/** Page area: re-keyed on every context switch so the swap cue plays once. */
export function Main({ model, className }: { model: SwitchModel; className?: string }) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-[1400px] px-4 pt-6 pb-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom,0px)+32px)] sm:px-8 md:pt-10 md:pb-16",
        className,
      )}
    >
      <div key={model.swapKey} className={model.swapKey ? "ws-swap" : undefined}>
        <PageContent model={model} />
      </div>
    </main>
  );
}
