import { UserButton, useUser } from "@clerk/react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  BedDouble,
  CalendarDays,
  Gauge,
  Hotel,
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
} from "@hotel-app/ui/components/sidebar";
import { TooltipProvider } from "@hotel-app/ui/components/tooltip";
import { cn } from "@hotel-app/ui/lib/utils";

import { ModeToggle } from "@/components/mode-toggle";

type NavItem = {
  label: string;
  to: "/dashboard" | "/reservations" | "/guests" | "/rooms" | "/settings";
  icon: React.ComponentType<{ className?: string }>;
};

const mainNav: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: Gauge },
  { label: "Reservations", to: "/reservations", icon: CalendarDays },
  { label: "Guests", to: "/guests", icon: Users },
  { label: "Rooms", to: "/rooms", icon: BedDouble },
];

const adminNav: NavItem[] = [
  { label: "Settings", to: "/settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <p className="text-sm font-medium">Hotel App</p>
                <p className="text-xs text-muted-foreground">Operations dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ModeToggle />
              <UserButton />
            </div>
          </header>
          <div className="flex-1 p-4 sm:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

function AppSidebar() {
  const { user } = useUser();
  const displayName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.username ||
    "Signed in";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-3 px-2 py-1.5">
          <span className="flex size-9 items-center justify-center border bg-sidebar-primary text-sidebar-primary-foreground">
            <Hotel className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">Hotel App</span>
            <span className="block truncate text-xs text-sidebar-foreground/55">
              Front desk workspace
            </span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNavGroup label="Operations" items={mainNav} />
        <SidebarNavGroup label="Workspace" items={adminNav} />
      </SidebarContent>
      <SidebarFooter>
        <div className="grid gap-1 px-2">
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
