// Direction 1, "Host": Airbnb host web. One top nav for every workspace
// (platform admin included), rose accent, photo-led listing cards; phones
// get a bottom tab bar whose Menu tab opens a sheet.
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tattvix/ui/components/dropdown-menu";
import { cn } from "@tattvix/ui/lib/utils";
import { Check, ChevronRight, LogOut, Menu, Settings, UserRound } from "lucide-react";
import { useState } from "react";

import { BottomTabBar } from "@/components/design-system";

import {
  currentWorkspace,
  isActive,
  navFor,
  notBuilt,
  openNav,
  openWorkspace,
  userFor,
  UserAvatar,
  WorkspaceMark,
  workspaces,
  type NavItem,
  type VariantProps,
} from "./common";
import { PortfolioScreen } from "./screen-portfolio";
import { TodayScreen } from "./screen-today";

export function HostVariant({ screen, onScreen }: VariantProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = navFor(screen);
  const tabs = nav.slice(0, 4);
  const overflow = nav.slice(4);

  return (
    <div className="min-h-dvh bg-background pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)]">
      <TopNav screen={screen} onScreen={onScreen} nav={nav} />
      <main className="mx-auto w-full max-w-[1440px] px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom,0px)+32px)] sm:px-8 md:pt-10 md:pb-16 xl:px-12">
        {screen === "hotels" ? <PortfolioScreen layout="gallery" /> : <TodayScreen layout="airy" />}
      </main>
      <BottomTabBar
        label={screen === "hotels" ? "Platform" : "Hotel"}
        items={[
          ...tabs.map((item) => ({
            key: item.key,
            label: item.short,
            icon: item.icon,
            isActive: isActive(item, screen),
            onClick: () => openNav(item, onScreen),
          })),
          { key: "menu", label: "Menu", icon: Menu, isActive: menuOpen, onClick: () => setMenuOpen(true) },
        ]}
      />
      <MenuSheet open={menuOpen} onOpenChange={setMenuOpen} screen={screen} onScreen={onScreen} overflow={overflow} />
    </div>
  );
}

function Wordmark() {
  return (
    <span className="flex w-fit items-center gap-2">
      <span className="grid size-9 place-items-center rounded-[11px] bg-primary text-base font-bold text-primary-foreground">T</span>
      <span className="hidden text-[19px] font-bold tracking-tight text-primary lg:inline">tattwix</span>
    </span>
  );
}

function TopNav({ screen, onScreen, nav }: VariantProps & { nav: NavItem[] }) {
  return (
    <header className="sticky top-0 z-30 hidden border-b border-border bg-background/95 backdrop-blur md:block">
      <div className="mx-auto grid h-20 max-w-[1440px] grid-cols-[auto_1fr_auto] items-center gap-4 px-8 lg:grid-cols-[1fr_auto_1fr] xl:px-12">
        <button type="button" onClick={() => onScreen(screen)} className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Tattwix home">
          <Wordmark />
        </button>
        <nav aria-label="Main" className="flex items-center justify-center gap-0.5 lg:gap-1">
          {nav.map((item) => {
            const active = isActive(item, screen);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => openNav(item, onScreen)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press relative flex h-11 items-center gap-1.5 rounded-full px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring lg:px-4",
                  active ? "font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.short}
                {item.badge ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular-nums">{item.badge}</span>
                ) : null}
                {active ? <span aria-hidden className="absolute inset-x-3 -bottom-[17px] h-[3px] rounded-full bg-foreground lg:inset-x-4" /> : null}
              </button>
            );
          })}
        </nav>
        <div className="flex justify-end">
          <AccountMenu screen={screen} onScreen={onScreen} />
        </div>
      </div>
    </header>
  );
}

function AccountMenu({ screen, onScreen }: VariantProps) {
  const workspace = currentWorkspace(screen);
  const user = userFor(screen);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="press flex h-12 items-center gap-2.5 rounded-full border border-border py-1.5 pr-1.5 pl-3 outline-none hover:shadow-raised focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Account and workspaces"
      >
        <span className="hidden min-w-0 items-center gap-2 xl:flex">
          <WorkspaceMark workspace={workspace} className="size-8 rounded-full" />
          <span className="max-w-[180px] truncate text-[15px] font-medium">{workspace.label}</span>
        </span>
        <Menu className="size-[18px] shrink-0" aria-hidden />
        <UserAvatar name={user.name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs">Switch workspace</DropdownMenuLabel>
          {workspaces.map((entry) => (
            <DropdownMenuItem key={entry.key} className="gap-3 rounded-lg py-2" onClick={() => openWorkspace(entry, onScreen)}>
              <WorkspaceMark workspace={entry} className="size-9 rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{entry.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{entry.detail}</span>
              </span>
              {entry.key === workspace.key ? <Check className="size-4 text-primary" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="py-2" onClick={() => notBuilt("Personal workspace")}>
          <UserRound className="size-4" />
          Personal
        </DropdownMenuItem>
        <DropdownMenuItem className="py-2" onClick={() => notBuilt("Account settings")}>
          <Settings className="size-4" />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuItem className="py-2" onClick={() => notBuilt("Sign out")}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuRow({ label, detail, leading, active, onClick }: { label: string; detail?: string; leading?: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="press flex min-h-14 w-full items-center gap-3 py-2 text-left outline-none focus-visible:bg-muted">
        {leading}
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-base", active && "font-semibold")}>{label}</span>
          {detail ? <span className="block truncate text-sm text-muted-foreground">{detail}</span> : null}
        </span>
        {active ? <Check className="size-4 shrink-0 text-primary" aria-label="Current" /> : <ChevronRight className="size-4 shrink-0 text-subtle-foreground" aria-hidden />}
      </button>
    </li>
  );
}

function MenuSheet({
  open,
  onOpenChange,
  screen,
  onScreen,
  overflow,
}: VariantProps & { open: boolean; onOpenChange: (open: boolean) => void; overflow: NavItem[] }) {
  const workspace = currentWorkspace(screen);
  const user = userFor(screen);
  const go = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Menu">
      <div className="grid gap-6">
        <div className="flex items-center gap-3">
          <WorkspaceMark workspace={workspace} className="size-14" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight">{workspace.label}</p>
            <p className="truncate text-sm text-muted-foreground">{workspace.detail}</p>
          </div>
        </div>
        {overflow.length ? (
          <ul className="divide-y divide-border-soft border-y border-border-soft">
            {overflow.map((item) => (
              <MenuRow key={item.key} label={item.label} leading={<item.icon className="size-5 text-muted-foreground" />} onClick={() => go(() => openNav(item, onScreen))} />
            ))}
          </ul>
        ) : null}
        <section>
          <h3 className="mb-1 text-sm text-subtle-foreground">Workspaces</h3>
          <ul className="divide-y divide-border-soft">
            {workspaces.map((entry) => (
              <MenuRow
                key={entry.key}
                label={entry.label}
                detail={entry.detail}
                leading={<WorkspaceMark workspace={entry} className="size-10" />}
                active={entry.key === workspace.key}
                onClick={() => go(() => openWorkspace(entry, onScreen))}
              />
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-1 text-sm text-subtle-foreground">Account</h3>
          <ul className="divide-y divide-border-soft">
            <MenuRow label="Account settings" detail={user.detail} leading={<UserAvatar name={user.name} className="size-10" />} onClick={() => go(() => notBuilt("Account settings"))} />
            <MenuRow label="Sign out" leading={<LogOut className="size-5 text-muted-foreground" />} onClick={() => go(() => notBuilt("Sign out"))} />
          </ul>
        </section>
      </div>
    </BottomSheet>
  );
}
