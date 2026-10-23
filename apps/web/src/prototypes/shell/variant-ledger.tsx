// Direction 2, "Ledger": a roomy white sidebar for every workspace (hotel
// staff included) from 768px, deep indigo accent, dense table-first
// screens. On phones a top bar keeps the workspace in view and a bottom
// tab bar carries the main pages; More opens the full sidebar as a sheet.
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
import { Menu } from "lucide-react";
import { useState } from "react";

import { currentWorkspace, isActive, navFor, openNav, TabBar, userFor, UserAvatar, WorkspaceMark, type VariantProps } from "./common";
import { PortfolioScreen } from "./screen-portfolio";
import { TodayScreen } from "./screen-today";
import { SidebarBody } from "./sidebar";

export function LedgerVariant({ screen, onScreen }: VariantProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const nav = navFor(screen);
  const workspace = currentWorkspace(screen);
  const user = userFor(screen);

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] border-r border-sidebar-border bg-sidebar md:block lg:w-[288px]">
        <SidebarBody screen={screen} onScreen={onScreen} tone="light" />
      </aside>

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur md:hidden">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-8">
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="press flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Workspace: ${workspace.label}. Open menu`}
          >
            <WorkspaceMark workspace={workspace} className="size-10" />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold">{workspace.label}</span>
              <span className="block truncate text-[13px] text-muted-foreground">{workspace.detail}</span>
            </span>
          </button>
          <UserAvatar name={user.name} />
        </div>
      </header>

      <main className="w-full px-4 pt-6 pb-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom,0px)+32px)] sm:px-8 md:pt-8 md:pr-8 md:pb-16 md:pl-[calc(256px+32px)] lg:pr-10 lg:pl-[calc(288px+40px)]">
        {screen === "hotels" ? <PortfolioScreen layout="table" /> : <TodayScreen layout="workbench" />}
      </main>

      <TabBar
          label={screen === "hotels" ? "Platform" : "Hotel"}
          items={[
            ...nav.slice(0, 4).map((item) => ({
              key: item.key,
              label: item.short,
              icon: item.icon,
              isActive: isActive(item, screen),
              onClick: () => openNav(item, onScreen),
            })),
            { key: "more", label: "More", icon: Menu, isActive: moreOpen, onClick: () => setMoreOpen(true) },
          ]}
        />

      <BottomSheet open={moreOpen} onOpenChange={setMoreOpen} title="Menu" className="h-[92dvh] md:h-[86dvh]">
        <div className="-mx-5 -mt-2 h-full">
          <SidebarBody screen={screen} onScreen={onScreen} tone="light" onNavigate={() => setMoreOpen(false)} />
        </div>
      </BottomSheet>
    </div>
  );
}
