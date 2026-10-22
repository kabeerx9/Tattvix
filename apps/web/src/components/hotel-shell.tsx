// Staff shell for the hotel workspace (docs/adr/0002-airbnb-style-staff-shell.md):
// a top nav from `md` up and a bottom tab bar on phones, replacing the
// sidebar. Personal and platform workspaces keep the sidebar shell.
import { useClerk, useUser } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useRouteContext } from "@tanstack/react-router";
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
import {
  BarChart3,
  BedDouble,
  Building2,
  CalendarCheck,
  Check,
  ChevronRight,
  ClipboardList,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { BottomTabBar } from "@/components/design-system";
import { propertyPhotoQueries } from "@/features/property-photos/queries";
import { getInitials } from "@/lib/initials";
import { hasPlatformPermission } from "@/lib/router-auth";
import {
  getActiveHotelContext,
  getHotelNavItems,
  getHotelSwitchOptions,
  splitHotelNavForTabBar,
  type HotelNavKey,
} from "@/lib/workspace-navigation";

const navIcons: Record<HotelNavKey, LucideIcon> = {
  overview: CalendarCheck,
  stays: ClipboardList,
  rooms: BedDouble,
  guests: Users,
  reports: BarChart3,
  settings: Settings,
};

function useHotelShell() {
  const { pathname } = useLocation();
  const { auth } = useRouteContext({ from: "__root__" });
  const { user } = useUser();
  const { signOut } = useClerk();
  const context = getActiveHotelContext(auth.currentUser, pathname);
  const items = context ? getHotelNavItems(context, pathname) : [];
  const { data: photos } = useQuery({
    ...propertyPhotoQueries.list(context?.membership.organization.slug ?? "", context?.property?.slug ?? ""),
    enabled: Boolean(context?.property),
  });
  const params = context?.property
    ? { organizationSlug: context.membership.organization.slug, propertySlug: context.property.slug }
    : null;
  const name =
    user?.fullName ||
    [auth.currentUser?.firstName, auth.currentUser?.lastName].filter(Boolean).join(" ") ||
    user?.primaryEmailAddress?.emailAddress ||
    "Signed in";
  return {
    pathname,
    context,
    items,
    params,
    coverUrl: photos?.cover?.url,
    switchOptions: getHotelSwitchOptions(auth.currentUser, context),
    canUsePlatform: hasPlatformPermission(auth, "platform:admin"),
    name,
    imageUrl: user?.imageUrl,
    signOut: () => signOut({ redirectUrl: "/login" }),
  };
}

export type HotelShellModel = ReturnType<typeof useHotelShell>;
type Shell = HotelShellModel;

export function HotelShell({ children }: { children: React.ReactNode }) {
  return <HotelShellView shell={useHotelShell()}>{children}</HotelShellView>;
}

/** The shell's markup, driven by a plain model (also used by UI fixtures). */
export function HotelShellView({ shell, children }: { shell: HotelShellModel; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { tabs, overflow, menuActive } = splitHotelNavForTabBar(shell.items);
  const hasTabBar = tabs.length > 0;

  // Close the menu sheet on any navigation (links, back/forward, redirects).
  useEffect(() => setMenuOpen(false), [shell.pathname]);

  return (
    <div className="min-h-dvh bg-background pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)]">
      <TopNav shell={shell} compactOnMobile={!hasTabBar} />
      <main
        className={cn(
          "mx-auto w-full max-w-[1400px] px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:px-8 md:pt-8",
          hasTabBar
            ? "pb-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom,0px)+24px)] md:pb-12"
            : "pb-12",
          !hasTabBar && "max-md:pt-4",
        )}
      >
        {children}
      </main>
      {hasTabBar && shell.params ? (
        <BottomTabBar
          label="Hotel"
          items={[
            ...tabs.map((item) => ({
              key: item.key,
              label: item.shortLabel,
              icon: navIcons[item.key],
              isActive: item.isActive,
              render: (props: { className: string; children: React.ReactNode; "aria-current"?: "page" }) => (
                <Link to={item.to} params={shell.params!} {...props} />
              ),
            })),
            { key: "menu", label: "Menu", icon: Menu, isActive: menuActive || menuOpen, onClick: () => setMenuOpen(true) },
          ]}
        />
      ) : null}
      <MenuSheet shell={shell} overflow={overflow} open={menuOpen} onOpenChange={setMenuOpen} />
    </div>
  );
}

function TopNav({ shell, compactOnMobile }: { shell: Shell; compactOnMobile: boolean }) {
  const property = shell.context?.property;
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border bg-background/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur",
        compactOnMobile ? "block" : "hidden md:block",
      )}
    >
      <div className="mx-auto grid h-16 max-w-[1400px] grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-8 md:h-20 md:grid-cols-[1fr_auto_1fr]">
        <Link
          to={shell.params ? "/hotel/$organizationSlug/$propertySlug/dashboard" : "/hotel"}
          params={shell.params ?? undefined}
          className="flex w-fit items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Tattwix, Today"
        >
          <span className="grid size-8 place-items-center rounded-[10px] bg-primary text-[15px] font-bold text-primary-foreground">
            T
          </span>
          <span className="hidden text-[17px] font-bold tracking-tight sm:inline">
            Tatt<span className="text-primary">w</span>ix
          </span>
        </Link>
        <nav aria-label="Hotel" className="hidden items-center gap-0.5 md:flex lg:gap-1">
          {shell.params
            ? shell.items.map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  params={shell.params!}
                  aria-current={item.isActive ? "page" : undefined}
                  className={cn(
                    "press relative flex h-10 items-center rounded-full px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring lg:px-4 lg:text-[15px]",
                    item.isActive
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.shortLabel}
                  {item.isActive ? (
                    <span aria-hidden className="absolute inset-x-3 -bottom-[19px] h-0.5 rounded-full bg-foreground lg:inset-x-4" />
                  ) : null}
                </Link>
              ))
            : null}
        </nav>
        <div className="flex items-center justify-end">
          <AccountMenu shell={shell} propertyName={property?.name} />
        </div>
      </div>
    </header>
  );
}

function Avatar({ shell, className }: { shell: Shell; className?: string }) {
  return shell.imageUrl ? (
    <img src={shell.imageUrl} alt="" className={cn("size-8 shrink-0 rounded-full object-cover", className)} />
  ) : (
    <span
      aria-hidden
      className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground", className)}
    >
      {getInitials(shell.name)}
    </span>
  );
}

/** Desktop account menu: switch property, workspaces, account, sign out. */
function AccountMenu({ shell, propertyName }: { shell: Shell; propertyName?: string }) {
  const organization = shell.context?.membership.organization;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="press flex h-11 max-w-[min(22rem,60vw)] items-center gap-2.5 rounded-full border border-border pr-1.5 pl-1.5 outline-none hover:shadow-raised focus-visible:ring-2 focus-visible:ring-ring lg:pl-1.5"
        aria-label="Account, hotels and workspaces"
      >
        {propertyName ? (
          <span className="hidden min-w-0 items-center gap-2 lg:flex">
            {shell.coverUrl ? (
              <img src={shell.coverUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
            ) : null}
            <span className="truncate pl-1 text-sm font-medium">{propertyName}</span>
          </span>
        ) : null}
        <Menu className="ml-1.5 size-4 shrink-0 lg:ml-0" aria-hidden />
        <Avatar shell={shell} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{organization ? `Signed in to ${organization.name}` : "Hotels"}</DropdownMenuLabel>
          {shell.switchOptions.map((option) => (
            <DropdownMenuItem key={option.key} render={<Link to={option.to} params={option.params} />}>
              <span className="flex-1 truncate">{option.label}</span>
              {option.isActive ? <Check className="size-4 text-primary" /> : null}
            </DropdownMenuItem>
          ))}
          {organization ? (
            <DropdownMenuItem render={<Link to="/hotel/$organizationSlug" params={{ organizationSlug: organization.slug }} />}>
              <Building2 className="size-4" />
              Manage properties
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem render={<Link to="/hotel" />}>
            <Building2 className="size-4" />
            All hotels
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuItem render={<Link to="/guest" />}>
            <UserRound className="size-4" />
            Personal
          </DropdownMenuItem>
          {shell.canUsePlatform ? (
            <DropdownMenuItem render={<Link to="/admin" />}>
              <ShieldCheck className="size-4" />
              Platform
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/settings" />}>
          <Settings className="size-4" />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shell.signOut}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuRow({
  icon: Icon,
  label,
  detail,
  active,
  render,
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  detail?: string;
  active?: boolean;
  render?: (props: { className: string; children: React.ReactNode }) => React.ReactElement;
  onClick?: () => void;
}) {
  const className =
    "press flex min-h-14 w-full items-center gap-3 py-2 text-left outline-none focus-visible:bg-muted";
  const children = (
    <>
      {Icon ? <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden /> : null}
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[15px]", active && "font-semibold")}>{label}</span>
        {detail ? <span className="block truncate text-sm text-muted-foreground">{detail}</span> : null}
      </span>
      {active ? <Check className="size-4 shrink-0 text-primary" aria-label="Current" /> : <ChevronRight className="size-4 shrink-0 text-subtle-foreground" aria-hidden />}
    </>
  );
  return (
    <li>
      {render ? render({ className, children }) : (
        <button type="button" className={className} onClick={onClick}>
          {children}
        </button>
      )}
    </li>
  );
}

/** Mobile "Menu" tab: the pages without a tab, the hotel switcher and account. */
function MenuSheet({
  shell,
  overflow,
  open,
  onOpenChange,
}: {
  shell: Shell;
  overflow: ReturnType<typeof splitHotelNavForTabBar>["overflow"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const property = shell.context?.property;
  const organization = shell.context?.membership.organization;
  const role = shell.context?.membership.role;
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Menu">
      <div className="grid gap-6">
        <div className="flex items-center gap-3">
          {shell.coverUrl ? (
            <img src={shell.coverUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted text-sm font-semibold text-muted-foreground">
              {getInitials(property?.name ?? organization?.name ?? "Hotel")}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight">{property?.name ?? organization?.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {[organization && property && organization.name !== property.name ? organization.name : null, role ? role.charAt(0) + role.slice(1).toLowerCase() : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        {overflow.length && shell.params ? (
          <ul className="divide-y divide-border-soft border-y border-border-soft">
            {overflow.map((item) => (
              <MenuRow
                key={item.key}
                icon={navIcons[item.key]}
                label={item.label}
                active={item.isActive}
                render={(props) => <Link to={item.to} params={shell.params!} {...props} />}
              />
            ))}
          </ul>
        ) : null}

        <section>
          <h3 className="mb-1 text-xs text-subtle-foreground">Hotels</h3>
          <ul className="divide-y divide-border-soft">
            {shell.switchOptions.length > 1
              ? shell.switchOptions.map((option) => (
                  <MenuRow
                    key={option.key}
                    label={option.label}
                    active={option.isActive}
                    render={(props) => <Link to={option.to} params={option.params} {...props} />}
                  />
                ))
              : null}
            {organization ? (
              <MenuRow
                icon={Building2}
                label="Manage properties"
                render={(props) => <Link to="/hotel/$organizationSlug" params={{ organizationSlug: organization.slug }} {...props} />}
              />
            ) : null}
            <MenuRow icon={Building2} label="All hotels" render={(props) => <Link to="/hotel" {...props} />} />
          </ul>
        </section>

        <section>
          <h3 className="mb-1 text-xs text-subtle-foreground">Account</h3>
          <ul className="divide-y divide-border-soft">
            <MenuRow icon={UserRound} label="Personal workspace" render={(props) => <Link to="/guest" {...props} />} />
            {shell.canUsePlatform ? (
              <MenuRow icon={ShieldCheck} label="Platform admin" render={(props) => <Link to="/admin" {...props} />} />
            ) : null}
            <MenuRow icon={Settings} label="Account settings" detail={shell.name} render={(props) => <Link to="/settings" {...props} />} />
            <MenuRow icon={LogOut} label="Sign out" onClick={shell.signOut} />
          </ul>
        </section>
      </div>
    </BottomSheet>
  );
}
