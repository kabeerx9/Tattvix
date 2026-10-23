// The roomy sidebar used by the Ledger (light) and Concierge (ink)
// directions: 15px labels on 44px rows, section labels, a workspace switcher
// with the hotel photo, and the account at the foot. All colours come from
// the sidebar-* tokens, so the same markup renders both tones.
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
import { Check, ChevronsUpDown, LogOut, MoreHorizontal, Settings, UserRound } from "lucide-react";

import {
  currentWorkspace,
  isActive,
  navSectionsFor,
  notBuilt,
  openNav,
  openWorkspace,
  userFor,
  UserAvatar,
  WorkspaceMark,
  workspaces,
  type VariantProps,
} from "./common";

type Tone = "light" | "ink";

export function SidebarBody({ screen, onScreen, tone, onNavigate }: VariantProps & { tone: Tone; onNavigate?: () => void }) {
  const go = (fn: () => void) => {
    onNavigate?.();
    fn();
  };
  return (
    <div className="flex h-full min-h-0 flex-col text-sidebar-foreground">
      <div className="px-5 pt-6 pb-4">
        <span className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-[11px] bg-sidebar-foreground text-base font-bold text-sidebar">T</span>
          <span className="text-[19px] font-bold tracking-tight">Tattwix</span>
        </span>
      </div>
      <div className="px-3 pb-2">
        <WorkspaceSwitcher screen={screen} onScreen={(next) => go(() => onScreen(next))} tone={tone} />
      </div>
      <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-4">
        {navSectionsFor(screen).map((section) => (
          <div key={section.label} className="mt-4 first:mt-0">
            <p className={"px-3 pb-1.5 text-[13px] font-medium text-(--sidebar-muted-foreground)"}>{section.label}</p>
            <ul className="grid gap-0.5">
              {section.items.map((item) => {
                const active = isActive(item, screen);
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => go(() => openNav(item, onScreen))}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "press relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                        active
                          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                          : "text-(--sidebar-nav-foreground) hover:bg-(--sidebar-hover) hover:text-sidebar-foreground",
                      )}
                    >
                      {/* The accent is only this indicator; icon and label stay neutral. */}
                      {active ? <span aria-hidden className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-r-full bg-sidebar-primary" /> : null}
                      <item.icon className="size-5 shrink-0" strokeWidth={active ? 2 : 1.75} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="grid h-6 min-w-6 place-items-center rounded-full border border-sidebar-border px-2 text-xs font-semibold text-sidebar-foreground tabular-nums">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className={cn("border-t p-3", tone === "ink" ? "border-sidebar-border" : "border-sidebar-border")}>
        <AccountRow screen={screen} tone={tone} />
      </div>
    </div>
  );
}

function WorkspaceSwitcher({ screen, onScreen, tone }: VariantProps & { tone: Tone }) {
  const workspace = currentWorkspace(screen);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "press flex w-full items-center gap-3 rounded-2xl border p-2 pr-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          tone === "ink" ? "border-sidebar-border bg-white/[0.04] hover:bg-white/[0.08]" : "border-border bg-card shadow-card hover:bg-muted",
        )}
        aria-label={`Workspace: ${workspace.label}. Switch workspace`}
      >
        <WorkspaceMark workspace={workspace} className={cn("size-11", tone === "ink" && !workspace.photo && "border-sidebar-border text-sidebar-foreground")} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{workspace.label}</span>
          <span className={cn("block truncate text-[13px]", "text-(--sidebar-muted-foreground)")}>{workspace.detail}</span>
        </span>
        <ChevronsUpDown className={cn("size-4 shrink-0", "text-(--sidebar-muted-foreground)")} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[288px] p-2">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs">Switch workspace</DropdownMenuLabel>
          {workspaces.map((entry) => (
            <DropdownMenuItem key={entry.key} className="gap-3 rounded-lg py-2" onClick={() => openWorkspace(entry, onScreen)}>
              <WorkspaceMark workspace={entry} className="size-9 rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{entry.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{entry.detail}</span>
              </span>
              {entry.key === workspace.key ? <Check className="size-4 text-foreground" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountRow({ screen, tone }: { screen: VariantProps["screen"]; tone: Tone }) {
  const user = userFor(screen);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "press flex w-full items-center gap-3 rounded-xl p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          tone === "ink" ? "hover:bg-white/[0.06]" : "hover:bg-muted",
        )}
        aria-label="Account"
      >
        <UserAvatar name={user.name} className={cn("size-10", tone === "ink" && "bg-sidebar-foreground text-sidebar")} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{user.name}</span>
          <span className={cn("block truncate text-[13px]", "text-(--sidebar-muted-foreground)")}>{user.role}</span>
        </span>
        <MoreHorizontal className={cn("size-4 shrink-0", "text-(--sidebar-muted-foreground)")} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-[256px] p-2">
        <DropdownMenuLabel className="text-xs">{user.detail}</DropdownMenuLabel>
        <DropdownMenuItem className="py-2" onClick={() => notBuilt("Personal workspace")}>
          <UserRound className="size-4" />
          Personal
        </DropdownMenuItem>
        <DropdownMenuItem className="py-2" onClick={() => notBuilt("Account settings")}>
          <Settings className="size-4" />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="py-2" onClick={() => notBuilt("Sign out")}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
