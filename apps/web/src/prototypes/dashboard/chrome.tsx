// Shared Airbnb-host-style chrome for the dashboard prototypes: desktop top
// nav, mobile bottom tab bar, large-title header and small atoms. Variants
// diverge in their content and interaction model, not in this frame.
import { cn } from "@tattvix/ui/lib/utils";
import {
  BedDouble,
  CalendarCheck,
  ClipboardList,
  Menu,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getInitials } from "@/lib/initials";

import { property } from "./data";

type NavKey = "today" | "stays" | "rooms" | "guests" | "reports" | "menu";

const desktopTabs: { key: NavKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "stays", label: "Stays" },
  { key: "rooms", label: "Rooms" },
  { key: "guests", label: "Guests" },
  { key: "reports", label: "Reports" },
];

const mobileTabs: { key: NavKey; label: string; icon: LucideIcon }[] = [
  { key: "today", label: "Today", icon: CalendarCheck },
  { key: "stays", label: "Stays", icon: ClipboardList },
  { key: "rooms", label: "Rooms", icon: BedDouble },
  { key: "guests", label: "Guests", icon: Users },
  { key: "menu", label: "Menu", icon: Menu },
];

function notBuilt(label: string) {
  toast(`${label} isn't part of this prototype`, { description: "Only the Today dashboard is mocked." });
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid size-8 place-items-center rounded-[10px] bg-primary text-[15px] font-bold text-primary-foreground">
        T
      </span>
      <span className="text-[17px] font-bold tracking-tight text-foreground">
        Tatt<span className="text-primary">w</span>ix
      </span>
    </span>
  );
}

export function TopNav({ active = "today" }: { active?: NavKey }) {
  return (
    <header className="sticky top-0 z-30 hidden border-b border-border bg-background/95 backdrop-blur md:block">
      <div className="mx-auto grid h-20 max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 lg:px-10">
        <Logo />
        <nav aria-label="Primary" className="flex items-center gap-1">
          {desktopTabs.map((tab) => {
            const isActive = tab.key === active;
            return (
              <button
                key={tab.key}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={isActive ? undefined : () => notBuilt(tab.label)}
                className={cn(
                  "pd-press relative h-10 rounded-full px-3.5 text-[15px] lg:px-4",
                  isActive ? "font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {tab.label}
                {isActive ? (
                  <span aria-hidden className="absolute inset-x-3.5 -bottom-[19px] h-0.5 rounded-full bg-foreground lg:inset-x-4" />
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => notBuilt("Switching properties")}
            className="pd-press hidden h-10 items-center gap-2 rounded-full px-3 text-sm font-medium hover:bg-muted lg:inline-flex"
          >
            {property.name}
          </button>
          <button
            type="button"
            aria-label="Account menu"
            onClick={() => notBuilt("The account menu")}
            className="pd-press inline-flex h-11 items-center gap-2.5 rounded-full border border-border pr-1.5 pl-3 hover:shadow-[var(--pd-shadow-raised)]"
          >
            <Menu className="size-4" />
            <Avatar name="Kabeer Joshi" size="sm" tone="dark" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function BottomTabBar({ active = "today" }: { active?: NavKey }) {
  return (
    <nav
      aria-label="Primary"
      className="pd-tabbar fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid h-[var(--pd-tabbar-height)] max-w-md grid-cols-5">
        {mobileTabs.map((tab) => {
          const isActive = tab.key === active;
          const Icon = tab.icon;
          return (
            <li key={tab.key} className="grid">
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={isActive ? () => window.scrollTo({ top: 0, behavior: "smooth" }) : () => notBuilt(tab.label)}
                className={cn(
                  "pd-press grid place-content-center justify-items-center gap-1 text-[11px]",
                  isActive ? "font-semibold text-primary" : "text-muted-foreground",
                )}
              >
                <Icon
                  className="size-6"
                  strokeWidth={isActive ? 2.1 : 1.6}
                  fill={isActive ? "currentColor" : "none"}
                  fillOpacity={isActive ? 0.16 : 0}
                  aria-hidden
                />
                {tab.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Large page title that collapses into a compact sticky header on mobile once
 * it scrolls out of view. On tablet/desktop it's just a big heading.
 */
export function LargeTitle({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setCollapsed(!entry!.isIntersecting), {
      rootMargin: "-52px 0px 0px 0px",
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        className="pd-compact sticky top-0 z-20 -mx-4 bg-background/95 backdrop-blur md:hidden"
        data-collapsed={collapsed ? "" : undefined}
      >
        <div className="flex h-12 items-center justify-center px-4">
          <p className="pd-compact-title truncate text-[15px] font-semibold" aria-hidden={!collapsed}>
            {title}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-4 md:pt-10">
        <div className="min-w-0">
          <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.025em] md:text-[34px]">{title}</h1>
          {meta ? <p className="mt-1.5 text-[15px] text-muted-foreground">{meta}</p> : null}
          <div ref={sentinel} aria-hidden className="h-px" />
        </div>
        {action}
      </div>
    </>
  );
}

const avatarSizes = { sm: "size-8 text-xs", md: "size-11 text-sm", lg: "size-14 text-base" } as const;

export function Avatar({
  name,
  size = "md",
  tone = "soft",
  className,
}: {
  name: string;
  size?: keyof typeof avatarSizes;
  tone?: "soft" | "dark";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold",
        tone === "dark" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        avatarSizes[size],
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}

/** Airbnb reservation-style pill filters with counts. */
export function PillTabs<T extends string>({
  value,
  onChange,
  items,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="pd-pills">
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={cn(
              "pd-press h-10 shrink-0 rounded-full border px-4 text-sm whitespace-nowrap",
              isActive
                ? "border-foreground/80 bg-background font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--foreground)]"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {item.label}
            {item.count !== undefined ? <span className="ml-1 tabular-nums">({item.count})</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function SectionTitle({
  title,
  meta,
  action,
  className,
}: {
  title: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">{title}</h2>
        {meta ? <p className="mt-0.5 text-sm text-muted-foreground">{meta}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function TextAction({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pd-press shrink-0 rounded-md text-sm font-semibold text-foreground underline underline-offset-4 hover:text-primary"
    >
      {children}
    </button>
  );
}

/** Page frame: top nav (md+), centred content, bottom tab bar (mobile). */
export function Frame({ children, active }: { children: React.ReactNode; active?: NavKey }) {
  return (
    <div className="pd-root">
      <TopNav active={active} />
      <main className="pd-page mx-auto max-w-[1280px] px-4 md:px-6 lg:px-10">{children}</main>
      <BottomTabBar active={active} />
    </div>
  );
}

