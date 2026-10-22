import { useClerk, useUser } from "@clerk/react";
import { Link, useLocation, useRouteContext } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Building2,
  Check,
  ChevronsUpDown,
  ClipboardCheck,
  Contact,
  IdCard,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tattvix/ui/components/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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

import { HotelShell } from "@/components/hotel-shell";
import { getInitials } from "@/lib/initials";
import {
  hasAnyHotelPermission,
  hasPlatformPermission,
} from "@/lib/router-auth";
import { getActiveWorkspace, getHotelDestination } from "@/lib/workspace-navigation";

type Icon = React.ComponentType<{ className?: string }>;
type FlatNavItem = {
  label: string;
  to:
    | "/guest"
    | "/stays"
    | "/profile"
    | "/companions"
    | "/privacy"
    | "/register-hotel"
    | "/settings"
    | "/admin"
    | "/admin/requests";
  icon: Icon;
};

const personalNav: FlatNavItem[] = [
  { label: "Overview", to: "/guest", icon: Contact },
  { label: "My stays", to: "/stays", icon: ClipboardCheck },
  { label: "Travel profile", to: "/profile", icon: IdCard },
  { label: "Companions", to: "/companions", icon: UsersRound },
  { label: "Privacy center", to: "/privacy", icon: ShieldCheck },
  { label: "Register hotel", to: "/register-hotel", icon: Building2 },
  { label: "Account settings", to: "/settings", icon: Settings },
];

const platformNav: FlatNavItem[] = [
  { label: "Super admin", to: "/admin", icon: ShieldCheck },
  { label: "Hotel requests", to: "/admin/requests", icon: ClipboardCheck },
];

// 44px rows in the mobile sheet (touch), the denser 36px rail from md up.
const navButtonClassName =
  "h-11 rounded-lg px-2.5 font-medium md:h-9 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground";

function isFlatItemActive(item: FlatNavItem, pathname: string) {
  return (
    pathname === item.to ||
    (item.to === "/stays" && pathname.startsWith("/stays/"))
  );
}

function useSectionLabel() {
  const { pathname } = useLocation();
  const workspace = getActiveWorkspace(pathname);
  const items = workspace === "platform" ? platformNav : personalNav;
  return items.find((item) => isFlatItemActive(item, pathname))?.label ?? "";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  // Hotel staff get the top nav / bottom tab bar shell (ADR 0002); personal
  // and platform workspaces keep the sidebar.
  if (getActiveWorkspace(pathname) === "hotel") return <HotelShell>{children}</HotelShell>;
  return <SidebarShell>{children}</SidebarShell>;
}

function SidebarShell({ children }: { children: React.ReactNode }) {
  const sectionLabel = useSectionLabel();
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-background pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)]">
          <CloseMobileSidebarOnNavigate />
          <header className="sticky top-0 z-20 flex h-[calc(--spacing(14)+env(safe-area-inset-top,0px))] items-center gap-2 border-b border-border bg-background/90 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur sm:px-8 md:gap-3">
            {/* 44px tap target on phones; the compact 28px trigger from md up. */}
            <SidebarTrigger className="-ml-2.5 size-11 md:-ml-1 md:size-7" />
            <p className="truncate text-sm font-medium">{sectionLabel}</p>
          </header>
          <main className="flex-1 p-4 sm:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

/**
 * The mobile sidebar is a sheet. Nav links close it on tap, but back/forward
 * and programmatic navigation (e.g. a redirect after a mutation) would leave
 * it open over the new page; closing on every pathname change covers both.
 */
function CloseMobileSidebarOnNavigate() {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);
  return null;
}

function AppSidebar() {
  const { pathname } = useLocation();
  const workspace = getActiveWorkspace(pathname);
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3 px-3 pt-4">
        <div className="flex items-center gap-2 px-1">
          <span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="size-3.5" />
          </span>
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Tattwix
          </span>
        </div>
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspace === "personal" ? <FlatNav items={personalNav} /> : null}
              {workspace === "platform" ? <FlatNav items={platformNav} /> : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-3">
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function SwitcherTile({ label }: { label: string }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-xs font-semibold text-accent-foreground">
      {getInitials(label)}
    </span>
  );
}

/** Which workspace the sidebar belongs to. Hotel staff use HotelShell instead. */
function WorkspaceSwitcher() {
  const { pathname } = useLocation();
  const workspace = getActiveWorkspace(pathname);
  const title = workspace === "platform" ? "Platform admin" : "Personal";
  const detail = workspace === "platform" ? "Super admin" : "Travel & identity";
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border p-2">
      <SwitcherTile label={title} />
      <span className="min-w-0 group-data-[collapsible=icon]:hidden">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-subtle-foreground">{detail}</span>
      </span>
    </div>
  );
}

function FlatNav({ items }: { items: FlatNavItem[] }) {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  return items.map((item) => {
    const isActive = isFlatItemActive(item, pathname);
    return (
      <SidebarMenuItem key={item.to}>
        <SidebarMenuButton
          isActive={isActive}
          tooltip={item.label}
          className={navButtonClassName}
          render={<Link to={item.to} onClick={() => setOpenMobile(false)} />}
        >
          <item.icon className="size-4" />
          <span className="truncate">{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  });
}

function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { auth } = useRouteContext({ from: "__root__" });
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  const workspace = getActiveWorkspace(pathname);
  const hotelDestination = getHotelDestination(auth.currentUser, pathname);
  const name =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.username ||
    "Signed in";
  const close = () => setOpenMobile(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Account and workspaces"
      >
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt="" className="size-8 shrink-0 rounded-full" />
        ) : (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
            {getInitials(name)}
          </span>
        )}
        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-subtle-foreground">Switch workspace</span>
        </span>
        <ChevronsUpDown className="size-4 text-subtle-foreground group-data-[collapsible=icon]:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuItem onClick={close} render={<Link to="/guest" />}>
            <UserRound className="size-4" />
            <span className="flex-1">Personal</span>
            {workspace === "personal" ? <Check className="size-4 text-primary" /> : null}
          </DropdownMenuItem>
          {hasAnyHotelPermission(auth, "hotel:view") ? (
            <DropdownMenuItem onClick={close} render={<Link {...hotelDestination} />}>
              <Building2 className="size-4" />
              <span className="flex-1">Hotel</span>
              {workspace === "hotel" ? <Check className="size-4 text-primary" /> : null}
            </DropdownMenuItem>
          ) : null}
          {hasPlatformPermission(auth, "platform:admin") ? (
            <DropdownMenuItem onClick={close} render={<Link to="/admin" />}>
              <ShieldCheck className="size-4" />
              <span className="flex-1">Platform</span>
              {workspace === "platform" ? <Check className="size-4 text-primary" /> : null}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={close} render={<Link to="/settings" />}>
          <Settings className="size-4" />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/login" })}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatRole(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
