import { UserButton, useUser } from "@clerk/react";
import { Link, useLocation, useRouteContext } from "@tanstack/react-router";
import {
  BedDouble,
  CalendarDays,
  Contact,
  Gauge,
  Hotel,
  ShieldCheck,
  Search,
  Settings,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@tattvix/ui/components/sidebar";
import { TooltipProvider } from "@tattvix/ui/components/tooltip";
import { cn } from "@tattvix/ui/lib/utils";

import { ModeToggle } from "@/components/mode-toggle";
import { hasAnyHotelPermission, hasPlatformPermission } from "@/lib/router-auth";

type NavItem = {
  label: string;
  to:
    | "/guest"
    | "/hotel"
    | "/dashboard"
    | "/reservations"
    | "/guests"
    | "/rooms"
    | "/admin"
    | "/settings";
  icon: React.ComponentType<{ className?: string }>;
};

const guestNav: NavItem[] = [
  { label: "Guest home", to: "/guest", icon: Contact },
  { label: "Account settings", to: "/settings", icon: Settings },
];

const hotelNav: NavItem[] = [
  { label: "Hotel portal", to: "/hotel", icon: Hotel },
  { label: "Dashboard", to: "/dashboard", icon: Gauge },
  { label: "Reservations", to: "/reservations", icon: CalendarDays },
  { label: "Guests", to: "/guests", icon: Users },
  { label: "Rooms", to: "/rooms", icon: BedDouble },
];

const platformNav: NavItem[] = [
  { label: "Super admin", to: "/admin", icon: ShieldCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const portalLabel = getPortalLabel(location.pathname);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-transparent">
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl sm:px-7">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="rounded-xl" />
              <div>
                <p className="text-xs text-muted-foreground">Workspace</p>
                <p className="text-sm font-semibold">{portalLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden h-10 w-64 items-center gap-2 rounded-xl border bg-card px-3 text-muted-foreground shadow-sm md:flex">
                <Search className="size-4" /><span className="text-xs">Search workspace...</span>
                <kbd className="ml-auto text-[10px]">⌘K</kbd>
              </div>
              <ModeToggle />
              <div className="rounded-full ring-4 ring-card"><UserButton /></div>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-7 lg:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

function AppSidebar() {
  const { user } = useUser();
  const { auth } = useRouteContext({ from: "__root__" });
  const canAccessHotel = hasAnyHotelPermission(auth, "hotel:view");
  const canAccessAdmin = hasPlatformPermission(auth, "platform:admin");
  const displayName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.username ||
    "Signed in";

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-3 py-5">
        <Link to="/guest" className="flex items-center gap-3 px-2 py-1.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Hotel className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold tracking-[-0.02em]">Tattvix</span>
            <span className="block truncate text-[11px] text-sidebar-foreground/55">Hotel workspace</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNavGroup label="Guest" items={guestNav} />
        {canAccessHotel ? <SidebarNavGroup label="Hotel" items={hotelNav} /> : null}
        {canAccessAdmin ? <SidebarNavGroup label="Platform" items={platformNav} /> : null}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="grid gap-1 rounded-xl bg-muted/70 px-3 py-3">
          <p className="truncate text-xs font-medium">{displayName}</p>
          <p className="truncate text-xs text-sidebar-foreground/55">
            {user?.primaryEmailAddress?.emailAddress ?? "Clerk account"}
          </p>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function getPortalLabel(pathname: string) {
  if (pathname === "/admin") {
    return "Platform administration";
  }

  if (["/hotel", "/dashboard", "/reservations", "/guests", "/rooms"].includes(pathname)) {
    return "Hotel operations";
  }

  return "Guest account";
}

function SidebarNavGroup({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.to}>
              <SidebarNavLink item={item} />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function SidebarNavLink({ item }: { item: NavItem }) {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();
  const isActive = location.pathname === item.to;

  return (
    <SidebarMenuButton
      isActive={isActive}
      className="h-10 rounded-xl px-3 font-medium"
      tooltip={item.label}
      render={
        <Link
          to={item.to}
          onClick={() => setOpenMobile(false)}
          className={cn(isActive && "bg-sidebar-accent text-sidebar-accent-foreground")}
        />
      }
    >
      <item.icon className="size-4" />
      <span>{item.label}</span>
    </SidebarMenuButton>
  );
}
