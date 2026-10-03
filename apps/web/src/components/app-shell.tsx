import { UserButton, useUser } from "@clerk/react";
import { Link, useLocation, useRouteContext } from "@tanstack/react-router";
import {
  BedDouble,
  Building2,
  ClipboardCheck,
  Contact,
  UsersRound,
  UserRound,
  IdCard,
  Gauge,
  Hotel,
  ShieldCheck,
  BarChart3,
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
import { Button } from "@tattvix/ui/components/button";
import { TooltipProvider } from "@tattvix/ui/components/tooltip";
import { cn } from "@tattvix/ui/lib/utils";

import { ModeToggle } from "@/components/mode-toggle";
import {
  hasAnyHotelPermission,
  hasPlatformPermission,
} from "@/lib/router-auth";
import {
  getActiveWorkspace,
  getHotelDestination,
} from "@/lib/workspace-navigation";

type NavItem = {
  label: string;
  to:
    | "/guest"
    | "/stays"
    | "/profile"
    | "/companions"
    | "/privacy"
    | "/register-hotel"
    | "/hotel"
    | "/admin"
    | "/admin/requests"
    | "/settings";
  icon: React.ComponentType<{ className?: string }>;
};

const guestNav: NavItem[] = [
  { label: "Overview", to: "/guest", icon: Contact },
  { label: "My stays", to: "/stays", icon: ClipboardCheck },
  { label: "Travel profile", to: "/profile", icon: IdCard },
  { label: "Companions", to: "/companions", icon: UsersRound },
  { label: "Privacy center", to: "/privacy", icon: ShieldCheck },
  { label: "Register hotel", to: "/register-hotel", icon: Building2 },
  { label: "Account settings", to: "/settings", icon: Settings },
];

const platformNav: NavItem[] = [
  { label: "Super admin", to: "/admin", icon: ShieldCheck },
  { label: "Hotel requests", to: "/admin/requests", icon: ClipboardCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { auth } = useRouteContext({ from: "__root__" });
  const workspace = getActiveWorkspace(location.pathname);
  const hotelDestination = getHotelDestination(
    auth.currentUser,
    location.pathname,
  );
  const membership = auth.currentUser?.memberships.find(
    (item) =>
      item.organization.slug === hotelDestination.params?.organizationSlug,
  );
  const property = membership?.properties.find(
    (item) => item.slug === hotelDestination.params?.propertySlug,
  );
  const label =
    workspace === "hotel"
      ? (membership?.organization.name ?? "My hotels")
      : workspace === "platform"
        ? "Platform administration"
        : "Personal account";
  const detail =
    workspace === "hotel"
      ? [
          property?.name !== membership?.organization.name
            ? property?.name
            : null,
          membership?.role.toLowerCase(),
        ]
          .filter(Boolean)
          .join(" · ")
      : workspace === "platform"
        ? "Super admin"
        : "Travel & identity";

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-transparent">
          <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/85 px-4 py-4 backdrop-blur-xl sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="rounded-xl" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{label}</p>
                <p className="truncate text-xs capitalize text-muted-foreground">
                  {detail}
                </p>
              </div>
            </div>
            <WorkspaceTabs />
            <div className="flex items-center gap-3">
              <ModeToggle />
              <div className="rounded-full ring-4 ring-card">
                <UserButton
                  userProfileMode="navigation"
                  userProfileUrl="/settings"
                />
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-7 lg:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

function WorkspaceTabs() {
  const { auth } = useRouteContext({ from: "__root__" });
  const { pathname } = useLocation();
  const workspace = getActiveWorkspace(pathname);
  const hotelDestination = getHotelDestination(auth.currentUser, pathname);
  const { setOpenMobile } = useSidebar();
  const closeMenu = () => setOpenMobile(false);
  return (
    <nav
      aria-label="Switch workspace"
      className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1"
    >
      <Button
        size="sm"
        variant={workspace === "personal" ? "default" : "ghost"}
        nativeButton={false}
        render={
          <Link
            to="/guest"
            aria-current={workspace === "personal" ? "page" : undefined}
            onClick={closeMenu}
          />
        }
      >
        <UserRound className="size-4" />
        Personal
      </Button>
      {hasAnyHotelPermission(auth, "hotel:view") ? (
        <Button
          size="sm"
          variant={workspace === "hotel" ? "default" : "ghost"}
          nativeButton={false}
          render={
            <Link
              {...hotelDestination}
              aria-current={workspace === "hotel" ? "page" : undefined}
              onClick={closeMenu}
            />
          }
        >
          <Building2 className="size-4" />
          Hotel
        </Button>
      ) : null}
      {hasPlatformPermission(auth, "platform:admin") ? (
        <Button
          size="sm"
          variant={workspace === "platform" ? "default" : "ghost"}
          nativeButton={false}
          render={
            <Link
              to="/admin"
              aria-current={workspace === "platform" ? "page" : undefined}
              onClick={closeMenu}
            />
          }
        >
          <ShieldCheck className="size-4" />
          Platform
        </Button>
      ) : null}
    </nav>
  );
}

function AppSidebar() {
  const { user } = useUser();
  const { auth } = useRouteContext({ from: "__root__" });
  const { pathname } = useLocation();
  const workspace = getActiveWorkspace(pathname);
  const canAccessHotel = hasAnyHotelPermission(auth, "hotel:view");
  const canAccessAdmin = hasPlatformPermission(auth, "platform:admin");
  const hotelDestination = getHotelDestination(auth.currentUser, pathname);
  const home =
    workspace === "hotel"
      ? hotelDestination
      : ({ to: workspace === "platform" ? "/admin" : "/guest" } as const);
  const displayName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.username ||
    "Signed in";
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-3 py-5">
        <Link
          {...home}
          onClick={() => setOpenMobile(false)}
          className="flex items-center gap-3 px-2 py-1.5"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Hotel className="size-5" />
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-base font-semibold tracking-[-0.02em]">
              Tattwix
            </span>
            <span className="block truncate text-[11px] text-sidebar-foreground/55">
              {workspace === "hotel"
                ? "Hotel workspace"
                : workspace === "platform"
                  ? "Platform administration"
                  : "Personal account"}
            </span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {workspace === "personal" ? (
          <SidebarNavGroup label="Personal" items={guestNav} />
        ) : null}
        {workspace === "hotel" && canAccessHotel ? <HotelNavigation /> : null}
        {workspace === "platform" && canAccessAdmin ? (
          <SidebarNavGroup label="Platform" items={platformNav} />
        ) : null}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="grid gap-1 rounded-xl bg-muted/70 px-3 py-3 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-xs font-medium">{displayName}</p>
          <p className="truncate text-xs text-sidebar-foreground/55">
            {user?.primaryEmailAddress?.emailAddress ?? "Account"}
          </p>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function HotelNavigation() {
  const { pathname } = useLocation();
  const { auth } = useRouteContext({ from: "__root__" });
  const destination = getHotelDestination(auth.currentUser, pathname);
  const membership = auth.currentUser?.memberships.find(
    (item) => item.organization.slug === destination.params?.organizationSlug,
  );
  const property = membership?.properties.find(
    (item) => item.slug === destination.params?.propertySlug,
  );
  const params =
    membership && property
      ? {
          organizationSlug: membership.organization.slug,
          propertySlug: property.slug,
        }
      : null;
  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        {membership?.organization.name ?? "Hotel"}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {params ? (
            <>
              <SidebarMenuItem>
                <ScopedSidebarLink
                  label="Overview"
                  icon={Gauge}
                  isActive={pathname.endsWith("/dashboard")}
                  to="/hotel/$organizationSlug/$propertySlug/dashboard"
                  params={params}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <ScopedSidebarLink
                  label="Check-ins & stays"
                  icon={ClipboardCheck}
                  isActive={pathname.includes("/stays")}
                  to="/hotel/$organizationSlug/$propertySlug/stays"
                  params={params}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <ScopedSidebarLink
                  label="Rooms"
                  icon={BedDouble}
                  isActive={pathname.endsWith("/rooms")}
                  to="/hotel/$organizationSlug/$propertySlug/rooms"
                  params={params}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <ScopedSidebarLink
                  label="Guests"
                  icon={Users}
                  isActive={pathname.endsWith("/guests")}
                  to="/hotel/$organizationSlug/$propertySlug/guests"
                  params={params}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <ScopedSidebarLink
                  label="Hotel details"
                  icon={Building2}
                  isActive={pathname.endsWith("/details")}
                  to="/hotel/$organizationSlug/$propertySlug/details"
                  params={params}
                />
              </SidebarMenuItem>
              {membership?.permissions.includes("reports:view") ? (
                <SidebarMenuItem>
                  <ScopedSidebarLink
                    label="Reports"
                    icon={BarChart3}
                    isActive={pathname.endsWith("/reports")}
                    to="/hotel/$organizationSlug/$propertySlug/reports"
                    params={params}
                  />
                </SidebarMenuItem>
              ) : null}
            </>
          ) : null}
          {membership ? (
            <SidebarMenuItem>
              <ScopedSidebarLink
                label="Hotel & properties"
                icon={Building2}
                isActive={
                  pathname === `/hotel/${membership.organization.slug}` ||
                  pathname === `/hotel/${membership.organization.slug}/`
                }
                to="/hotel/$organizationSlug"
                params={{ organizationSlug: membership.organization.slug }}
              />
            </SidebarMenuItem>
          ) : null}
          <SidebarMenuItem>
            <SidebarNavLink
              item={{ label: "My hotels", to: "/hotel", icon: Hotel }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function ScopedSidebarLink({
  label,
  icon: Icon,
  isActive,
  to,
  params,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  to:
    | "/hotel/$organizationSlug"
    | "/hotel/$organizationSlug/$propertySlug/dashboard"
    | "/hotel/$organizationSlug/$propertySlug/stays"
    | "/hotel/$organizationSlug/$propertySlug/guests"
    | "/hotel/$organizationSlug/$propertySlug/rooms"
    | "/hotel/$organizationSlug/$propertySlug/reports"
    | "/hotel/$organizationSlug/$propertySlug/details";
  params: { organizationSlug: string; propertySlug?: string };
}) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuButton
      isActive={isActive}
      className="h-10 rounded-xl px-3 font-medium"
      tooltip={label}
      render={
        <Link
          to={to}
          params={params}
          onClick={() => setOpenMobile(false)}
          className={cn(
            isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        />
      }
    >
      <Icon className="size-4" />
      <span className="truncate">{label}</span>
    </SidebarMenuButton>
  );
}

function SidebarNavGroup({
  label,
  items,
}: {
  label: string;
  items: NavItem[];
}) {
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
  const isActive =
    location.pathname === item.to ||
    (item.to === "/stays" && location.pathname.startsWith("/stays/"));

  return (
    <SidebarMenuButton
      isActive={isActive}
      className="h-10 rounded-xl px-3 font-medium"
      tooltip={item.label}
      render={
        <Link
          to={item.to}
          onClick={() => setOpenMobile(false)}
          className={cn(
            isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        />
      }
    >
      <item.icon className="size-4" />
      <span>{item.label}</span>
    </SidebarMenuButton>
  );
}
