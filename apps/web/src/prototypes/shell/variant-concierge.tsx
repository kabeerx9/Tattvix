// Direction 3, "Concierge": a floating near-black ink sidebar beside a white
// canvas, plum accent, photo-led headers. Phones get no tab bar: a slim top
// bar with the page title and a full-height ink sheet holding the whole
// sidebar (workspaces, sections, account).
import { Sheet, SheetContent, SheetTitle } from "@tattvix/ui/components/sheet";
import { Menu } from "lucide-react";
import { useState } from "react";

import { currentWorkspace, isActive, navFor, userFor, UserAvatar, type VariantProps } from "./common";
import { PortfolioScreen } from "./screen-portfolio";
import { TodayScreen } from "./screen-today";
import { SidebarBody } from "./sidebar";

export function ConciergeVariant({ screen, onScreen }: VariantProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const page = navFor(screen).find((item) => isActive(item, screen));
  const workspace = currentWorkspace(screen);
  const user = userFor(screen);

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed top-3 bottom-3 left-3 z-30 hidden w-[248px] overflow-hidden rounded-[22px] bg-sidebar shadow-raised md:block lg:w-[272px]">
        <SidebarBody screen={screen} onScreen={onScreen} tone="ink" />
      </aside>

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur md:hidden">
        <div className="grid h-14 grid-cols-[44px_1fr_44px] items-center px-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="press grid size-11 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Menu className="size-[22px]" />
          </button>
          <p className="min-w-0 truncate text-center text-[15px] font-semibold">
            {page?.label}
            <span className="font-normal text-muted-foreground"> · {workspace.label}</span>
          </p>
          <span className="grid place-items-center">
            <UserAvatar name={user.name} className="size-8 text-xs" />
          </span>
        </div>
      </header>

      <main className="w-full px-4 pt-6 pb-16 sm:px-8 md:pt-10 md:pr-8 md:pl-[calc(248px+12px+32px)] lg:pr-12 lg:pl-[calc(272px+12px+48px)]">
        {screen === "hotels" ? <PortfolioScreen layout="split" /> : <TodayScreen layout="cover" />}
      </main>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="border-sidebar-border bg-sidebar text-sidebar-foreground duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:max-w-[360px] [&_[data-slot=sheet-close]]:text-sidebar-foreground [&_[data-slot=sheet-close]]:hover:bg-white/10"
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarBody screen={screen} onScreen={onScreen} tone="ink" onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
