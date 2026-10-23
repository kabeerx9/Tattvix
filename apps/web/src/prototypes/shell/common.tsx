// Shared pieces for the shell prototypes: the nav model each variant
// renders, the workspace switcher options and small helpers.
import { cn } from "@tattvix/ui/lib/utils";
import {
  BarChart3,
  BedDouble,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  Settings,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { getInitials } from "@/lib/initials";

import { adminUser, photos, staffUser } from "./data";

export type Screen = "hotels" | "today";

export type VariantProps = {
  screen: Screen;
  onScreen: (screen: Screen) => void;
};

export type NavItem = {
  key: string;
  label: string;
  short: string;
  icon: LucideIcon;
  screen?: Screen;
  badge?: number;
};

export const adminNav: NavItem[] = [
  { key: "hotels", label: "Hotels", short: "Hotels", icon: Building2, screen: "hotels" },
  { key: "requests", label: "Hotel requests", short: "Requests", icon: ClipboardCheck, badge: 3 },
  { key: "oversight", label: "Oversight", short: "Oversight", icon: ShieldAlert },
];

export const hotelNav: NavItem[] = [
  { key: "today", label: "Today", short: "Today", icon: CalendarCheck, screen: "today" },
  { key: "stays", label: "Stays", short: "Stays", icon: ClipboardList },
  { key: "rooms", label: "Rooms", short: "Rooms", icon: BedDouble },
  { key: "guests", label: "Guests", short: "Guests", icon: Users },
  { key: "reports", label: "Reports", short: "Reports", icon: BarChart3 },
  { key: "settings", label: "Property settings", short: "Settings", icon: Settings },
];

/** Sidebar grouping: readable section labels over 44px rows. */
export function navSectionsFor(screen: Screen): { label: string; items: NavItem[] }[] {
  return screen === "hotels"
    ? [{ label: "Platform", items: adminNav }]
    : [
        { label: "Front desk", items: hotelNav.slice(0, 4) },
        { label: "Manage", items: hotelNav.slice(4) },
      ];
}

export function navFor(screen: Screen) {
  return screen === "hotels" ? adminNav : hotelNav;
}

export function isActive(item: NavItem, screen: Screen) {
  return item.screen === screen;
}

/** Nav items that aren't part of this prototype say so instead of dead-ending. */
export function openNav(item: NavItem, onScreen: (screen: Screen) => void) {
  if (item.screen) onScreen(item.screen);
  else toast(`${item.label} isn't in this prototype`, { description: "Only Hotels (platform admin) and Today (hotel staff) are built." });
}

export type Workspace = {
  key: string;
  label: string;
  detail: string;
  screen?: Screen;
  photo?: string;
  icon?: LucideIcon;
};

export const workspaces: Workspace[] = [
  { key: "platform", label: "Platform admin", detail: "8 hotels · 6 organizations", screen: "hotels", icon: Building2 },
  { key: "umaid", label: "Umaid Niwas Haveli", detail: "Rajwada Hospitality · Jaipur", screen: "today", photo: photos.haveli },
  { key: "lakeview", label: "Lakeview Residency", detail: "Rajwada Hospitality · Udaipur", photo: photos.udaipur },
];

export function currentWorkspace(screen: Screen) {
  return workspaces.find((workspace) => workspace.screen === screen)!;
}

export function openWorkspace(workspace: Workspace, onScreen: (screen: Screen) => void) {
  if (workspace.screen) onScreen(workspace.screen);
  else toast(`${workspace.label} isn't in this prototype`, { description: "Switch between Platform admin and Umaid Niwas Haveli." });
}

export function userFor(screen: Screen) {
  return screen === "hotels"
    ? { name: adminUser.name, detail: adminUser.email, role: adminUser.role }
    : { name: staffUser.name, detail: staffUser.email, role: staffUser.role };
}

export function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-[13px] font-semibold text-background", className)}
    >
      {getInitials(name)}
    </span>
  );
}

/**
 * Workspace mark: the hotel photo, or (platform) a hairline-outlined slot with
 * a neutral line icon. Never a tinted fill behind an icon.
 */
export function WorkspaceMark({ workspace, className }: { workspace: Workspace; className?: string }) {
  if (workspace.photo) return <img src={workspace.photo} alt="" className={cn("size-10 shrink-0 rounded-xl object-cover", className)} />;
  const Icon = workspace.icon ?? Building2;
  return (
    <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-xl border border-border text-foreground", className)}>
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
  );
}

/**
 * A photo slot. Without a photo it is a quiet muted slot with a short text
 * label (big slots) or nothing (thumbnails), never an icon-on-grey tile.
 */
export function Photo({ url, className, label }: { url?: string | null; className?: string; label?: string }) {
  return url ? (
    <img src={url} alt="" loading="lazy" decoding="async" className={cn("bg-muted object-cover", className)} />
  ) : (
    <div aria-hidden={!label} className={cn("grid place-items-center bg-muted p-2 text-center text-xs text-muted-foreground", className)}>{label}</div>
  );
}

/**
 * Stats without icon tiles: weight comes from the number's typography.
 * Divided by hairlines like KpiStrip, wrapping to 2/3 columns below lg.
 */
export function StatStrip({ items }: { items: { label: string; value: React.ReactNode; detail?: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-card border border-border bg-card shadow-card max-lg:*:-mr-px max-lg:*:-mb-px max-lg:*:border-r max-lg:*:border-b max-lg:*:border-border-soft sm:grid-cols-3 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none lg:divide-x lg:divide-border-soft">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 p-4 sm:p-5">
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="mt-2 text-[30px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{item.value}</dd>
          {item.detail ? <dd className="mt-2 text-xs leading-relaxed text-subtle-foreground">{item.detail}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

export type TabBarItem = { key: string; label: string; icon: LucideIcon; isActive: boolean; onClick: () => void };

/**
 * Phone tab bar. Icons and labels stay neutral; the active tab is
 * foreground + semibold with a short accent indicator above it.
 */
export function TabBar({ items, label }: { items: TabBarItem[]; label: string }) {
  return (
    <nav
      aria-label={label}
      data-bottom-tab-bar=""
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid h-(--tab-bar-height) max-w-md" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => (
          <li key={item.key} className="grid min-w-0">
            <button
              type="button"
              onClick={item.onClick}
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "press relative grid h-full place-content-center justify-items-center gap-1 text-[11px] outline-none focus-visible:bg-muted",
                item.isActive ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {item.isActive ? <span aria-hidden className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-primary" /> : null}
              <item.icon aria-hidden className="size-6" strokeWidth={item.isActive ? 2.1 : 1.6} />
              <span className="max-w-full truncate px-1">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function notBuilt(label: string) {
  toast(`${label} isn't in this prototype`);
}

/** Keeps the last non-null value so a sheet can animate out with its content. */
export function useLastDefined<T>(value: T | null | undefined): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  if (value !== null && value !== undefined) ref.current = value;
  return ref.current;
}
