import { useQuery } from "@tanstack/react-query";
import { propertyPhotoQueries } from "@/features/property-photos/queries";
import { useClerk, useUser } from "@clerk/react";
import { Link, useLocation, useRouteContext } from "@tanstack/react-router";
import {
  BarChart3,
  BedDouble,
  Building2,
  Check,
  ChevronsUpDown,
  ClipboardCheck,
  Contact,
  Gauge,
  IdCard,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
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

import { getInitials } from "@/lib/initials";
import {
  hasAnyHotelPermission,
  hasPlatformPermission,
} from "@/lib/router-auth";
import {
  getActiveHotelContext,
  getActiveWorkspace,
  getHotelDestination,
  getHotelNavItems,
  type HotelNavKey,
} from "@/lib/workspace-navigation";

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

const hotelNavIcons: Record<HotelNavKey, Icon> = {
  overview: Gauge,
  stays: ClipboardCheck,
  rooms: BedDouble,
  guests: Users,
  reports: BarChart3,
  settings: Settings,
};

function isFlatItemActive(item: FlatNavItem, pathname: string) {
  return (
    pathname === item.to ||
    (item.to === "/stays" && pathname.startsWith("/stays/"))
  );
}

function useSectionLabel() {
  const { pathname } = useLocation();
  const { auth } = useRouteContext({ from: "__root__" });
  const workspace = getActiveWorkspace(pathname);
  if (workspace === "hotel") {
    const context = getActiveHotelContext(auth.currentUser, pathname);
    if (!context) return "Hotels";
    return (
      getHotelNavItems(context, pathname).find((item) => item.isActive)
        ?.label ?? context.membership.organization.name
    );
  }
  const items = workspace === "platform" ? platformNav : personalNav;
  return items.find((item) => isFlatItemActive(item, pathname))?.label ?? "";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const sectionLabel = useSectionLabel();
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-background">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-8">
            <SidebarTrigger className="-ml-1" />
            <p className="truncate text-sm font-medium">{sectionLabel}</p>
          </header>
          <main className="flex-1 p-4 sm:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
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
              {workspace === "hotel" ? <HotelNav /> : null}
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

function SwitcherTile({ label, url }: { label: string | null; url?: string }) {
  if (url) return <img src={url} alt="" className="size-8 shrink-0 rounded-md object-cover" />;
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-xs font-semibold text-accent-foreground">
      {label ? getInitials(label) : <Building2 className="size-4 text-muted-foreground" />}
    </span>
  );
}

function WorkspaceSwitcher() {
  const { pathname } = useLocation();
  const { auth } = useRouteContext({ from: "__root__" });
  const { setOpenMobile } = useSidebar();
  const workspace = getActiveWorkspace(pathname);

  const context = workspace === "hotel" ? getActiveHotelContext(auth.currentUser, pathname) : null;
  const { data: photos } = useQuery({
    ...propertyPhotoQueries.list(context?.membership.organization.slug ?? "", context?.property?.slug ?? ""),
    enabled: Boolean(context?.property),
  });

  if (workspace !== "hotel") {
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

  const memberships =
    auth.currentUser?.memberships.filter((item) =>
      item.permissions.includes("hotel:view"),
    ) ?? [];
  const title = context?.membership.organization.name ?? "Choose a hotel";
  const detail = context
    ? [
        context.property && context.property.name !== title
          ? context.property.name
          : null,
        formatRole(context.membership.role),
      ]
        .filter(Boolean)
        .join(" · ")
    : `${memberships.length} ${memberships.length === 1 ? "hotel" : "hotels"}`;

  return (
    <div className="grid gap-2">
      {photos?.cover ? <img src={photos.cover.url} alt="" className="h-14 w-full rounded-md object-cover group-data-[collapsible=icon]:hidden" /> : null}
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2.5 rounded-lg border border-border p-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Switch hotel"
      >
        <SwitcherTile label={context ? title : null} url={photos?.cover?.url} />
        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-sm font-semibold">{title}</span>
          <span className="block truncate text-xs text-subtle-foreground">{detail}</span>
        </span>
        <ChevronsUpDown className="size-4 text-subtle-foreground group-data-[collapsible=icon]:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Hotels</DropdownMenuLabel>
          {memberships.flatMap((membership) =>
            membership.properties.length === 0
              ? [
                  <DropdownMenuItem
                    key={`org-${membership.id}`}
                    onClick={() => setOpenMobile(false)}
                    render={
                      <Link
                        to="/hotel/$organizationSlug"
                        params={{ organizationSlug: membership.organization.slug }}
                      />
                    }
                  >
                    <span className="flex-1 truncate">{membership.organization.name}</span>
                  </DropdownMenuItem>,
                ]
              : membership.properties.map((property) => {
                  const active =
                    context?.membership.id === membership.id &&
                    context.property?.id === property.id;
                  return (
                    <DropdownMenuItem
                      key={`prop-${property.id}`}
                      onClick={() => setOpenMobile(false)}
                      render={
                        <Link
                          to="/hotel/$organizationSlug/$propertySlug/dashboard"
                          params={{
                            organizationSlug: membership.organization.slug,
                            propertySlug: property.slug,
                          }}
                        />
                      }
                    >
                      <span className="flex-1 truncate">
                        {membership.organization.name}
                        {property.name !== membership.organization.name
                          ? ` · ${property.name}`
                          : ""}
                      </span>
                      {active ? <Check className="size-4 text-primary" /> : null}
                    </DropdownMenuItem>
                  );
                }),
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {context ? (
          <DropdownMenuItem
            onClick={() => setOpenMobile(false)}
            render={
              <Link
                to="/hotel/$organizationSlug"
                params={{ organizationSlug: context.membership.organization.slug }}
              />
            }
          >
            <Building2 className="size-4" />
            Manage properties
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() => setOpenMobile(false)}
          render={<Link to="/hotel" />}
        >
          <Building2 className="size-4" />
          All hotels
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
}

function HotelNav() {
  const { pathname } = useLocation();
  const { auth } = useRouteContext({ from: "__root__" });
  const { setOpenMobile } = useSidebar();
  const context = getActiveHotelContext(auth.currentUser, pathname);
  if (!context?.property) return null;
  const params = {
    organizationSlug: context.membership.organization.slug,
    propertySlug: context.property.slug,
  };
  return getHotelNavItems(context, pathname).map((item) => {
    const ItemIcon = hotelNavIcons[item.key];
    return (
      <SidebarMenuItem key={item.key}>
        <SidebarMenuButton
          isActive={item.isActive}
          tooltip={item.label}
          className="h-9 rounded-lg px-2.5 font-medium data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
          render={
            <Link
              to={item.to}
              params={params}
              onClick={() => setOpenMobile(false)}
            />
          }
        >
          <ItemIcon className="size-4" />
          <span className="truncate">{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  });
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
          className="h-9 rounded-lg px-2.5 font-medium data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
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
