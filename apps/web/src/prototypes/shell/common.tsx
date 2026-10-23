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

/** Workspace mark: hotel photo, or a neutral tile with an icon for platform. */
export function WorkspaceMark({ workspace, className }: { workspace: Workspace; className?: string }) {
  if (workspace.photo) return <img src={workspace.photo} alt="" className={cn("size-10 shrink-0 rounded-xl object-cover", className)} />;
  const Icon = workspace.icon ?? Building2;
  return (
    <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground", className)}>
      <Icon className="size-5" />
    </span>
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
