// The one app shell for every signed-in workspace (personal, hotel staff,
// platform admin), per docs/adr/0003-host-shell-and-accent-restraint.md:
// a sticky top nav from `md` up and a bottom tab bar with a Menu sheet on
// phones. Which pages a workspace has, which become tabs and who may switch
// where is decided by the pure functions in lib/workspace-navigation.ts;
// this file only renders that model.
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
import { useActiveIndicator } from "@tattvix/ui/hooks/use-active-indicator";
import { cn } from "@tattvix/ui/lib/utils";
import {
  BarChart3,
  BedDouble,
  Building2,
  CalendarCheck,
  Check,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Contact,
  IdCard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BrandLogo } from "@/components/brand";
import { BottomTabBar } from "@/components/design-system";
import { propertyPhotoQueries } from "@/features/property-photos/queries";
import { getInitials } from "@/lib/initials";
import {
  getActiveHotelContext,
  getActiveWorkspace,
  getHotelNavItems,
  getHotelSwitchOptions,
  getPersonalNavItems,
  getPlatformNavItems,
  getWorkspaceOptions,
  isAccountPath,
  splitHotelNavForTabBar,
  splitPersonalNavForTabBar,
  splitPlatformNavForTabBar,
  type ActiveHotelContext,
  type HotelSwitchOption,
  type Workspace,
  type WorkspaceOption,
} from "@/lib/workspace-navigation";

type LinkProps = { className: string; children: React.ReactNode; "aria-current"?: "page" };

/** One nav destination, already resolved to a router link for its workspace. */
export type ShellNavEntry = {
  key: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  isActive: boolean;
  render: (props: LinkProps) => React.ReactElement;
};

const icons = {
  hotel: {
    overview: CalendarCheck,
    stays: ClipboardList,
    rooms: BedDouble,
    guests: Users,
    reports: BarChart3,
    settings: Settings,
  },
  personal: {
    overview: Contact,
    stays: ClipboardCheck,
    profile: IdCard,
    companions: UsersRound,
    privacy: ShieldCheck,
    register: Building2,
  },
  platform: { hotels: Building2, requests: ClipboardCheck },
} as const;

/** Nav entries for the workspace in the URL, split for the phone tab bar. */
function resolveNav(workspace: Workspace, context: ActiveHotelContext | null, pathname: string) {
  if (workspace === "hotel") {
    const items = context ? getHotelNavItems(context, pathname) : [];
    const params = context?.property
      ? { organizationSlug: context.membership.organization.slug, propertySlug: context.property.slug }
      : null;
    const toEntry = (item: (typeof items)[number]): ShellNavEntry => ({
      key: item.key,
      label: item.label,
      shortLabel: item.shortLabel,
      icon: icons.hotel[item.key],
      isActive: item.isActive,
      render: (props) => <Link to={item.to} params={params!} {...props} />,
    });
    const split = splitHotelNavForTabBar(items);
    return {
      home: params
        ? (props: LinkProps) => <Link to="/hotel/$organizationSlug/$propertySlug/dashboard" params={params} {...props} />
        : (props: LinkProps) => <Link to="/hotel" {...props} />,
      items: params ? items.map(toEntry) : [],
      tabs: params ? split.tabs.map(toEntry) : [],
      overflow: params ? split.overflow.map(toEntry) : [],
      menuActive: split.menuActive,
    };
  }
  if (workspace === "platform") {
    const items = getPlatformNavItems(pathname);
    const toEntry = (item: (typeof items)[number]): ShellNavEntry => ({
      key: item.key,
      label: item.label,
      shortLabel: item.shortLabel,
      icon: icons.platform[item.key],
      isActive: item.isActive,
      render: (props) => <Link to={item.to} {...props} />,
    });
    const split = splitPlatformNavForTabBar(items);
    return {
      home: (props: LinkProps) => <Link to="/admin" {...props} />,
      items: items.map(toEntry),
      tabs: split.tabs.map(toEntry),
      overflow: split.overflow.map(toEntry),
      menuActive: split.menuActive,
    };
  }
  const items = getPersonalNavItems(pathname);
  const toEntry = (item: (typeof items)[number]): ShellNavEntry => ({
    key: item.key,
    label: item.label,
    shortLabel: item.shortLabel,
    icon: icons.personal[item.key],
    isActive: item.isActive,
    render: (props) => <Link to={item.to} {...props} />,
  });
  const split = splitPersonalNavForTabBar(items);
  return {
    home: (props: LinkProps) => <Link to="/guest" {...props} />,
    items: items.map(toEntry),
    tabs: split.tabs.map(toEntry),
    overflow: split.overflow.map(toEntry),
    menuActive: split.menuActive,
  };
}

function useAppShell() {
  const { pathname } = useLocation();
  const { auth } = useRouteContext({ from: "__root__" });
  const { user } = useUser();
  const { signOut } = useClerk();
  const workspace = getActiveWorkspace(pathname);
  const context = workspace === "hotel" ? getActiveHotelContext(auth.currentUser, pathname) : null;
  const { data: photos } = useQuery({
    ...propertyPhotoQueries.list(context?.membership.organization.slug ?? "", context?.property?.slug ?? ""),
    enabled: Boolean(context?.property),
  });
  const name =
    user?.fullName ||
    [auth.currentUser?.firstName, auth.currentUser?.lastName].filter(Boolean).join(" ") ||
    user?.primaryEmailAddress?.emailAddress ||
    auth.currentUser?.email ||
    "Signed in";
  return {
    pathname,
    workspace,
    context,
    nav: resolveNav(workspace, context, pathname),
    accountActive: isAccountPath(pathname),
    coverUrl: photos?.cover?.url,
    switchOptions: workspace === "hotel" ? getHotelSwitchOptions(auth.currentUser, context) : [],
    workspaces: getWorkspaceOptions(auth.currentUser, pathname),
    name,
    imageUrl: user?.imageUrl,
    signOut: () => signOut({ redirectUrl: "/login" }),
  };
}

export type AppShellModel = ReturnType<typeof useAppShell>;
type Shell = AppShellModel;

export function AppShell({ children }: { children: React.ReactNode }) {
  return <AppShellView shell={useAppShell()}>{children}</AppShellView>;
}

/** What the workspace pill and Menu sheet call the current workspace. */
function workspaceIdentity(shell: Shell) {
  if (shell.workspace === "hotel") {
    const property = shell.context?.property;
    const organization = shell.context?.membership.organization;
    const role = shell.context?.membership.role;
    return {
      title: property?.name ?? organization?.name ?? "Hotel",
      detail: [
        organization && property && organization.name !== property.name ? organization.name : null,
        role ? role.charAt(0) + role.slice(1).toLowerCase() : null,
      ]
        .filter(Boolean)
        .join(" · "),
      showInPill: Boolean(property ?? organization),
    };
  }
  if (shell.workspace === "platform") {
    return { title: "Platform admin", detail: "Every hotel on Tattwix", showInPill: true };
  }
  return { title: shell.name, detail: "Personal", showInPill: false };
}

/** The shell's markup, driven by a plain model (also usable from UI fixtures). */
export function AppShellView({ shell, children }: { shell: AppShellModel; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasTabBar = shell.nav.tabs.length > 0;

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
            : "pb-12 max-md:pt-4",
        )}
      >
        {children}
      </main>
      {hasTabBar ? (
        <BottomTabBar
          label={workspaceIdentity(shell).title}
          items={[
            ...shell.nav.tabs.map((item) => ({
              key: item.key,
              label: item.shortLabel,
              icon: item.icon,
              isActive: item.isActive,
              render: item.render,
            })),
            {
              key: "menu",
              label: "Menu",
              icon: Menu,
              isActive: shell.nav.menuActive || shell.accountActive || menuOpen,
              onClick: () => setMenuOpen(true),
            },
          ]}
        />
      ) : null}
      <MenuSheet shell={shell} open={menuOpen} onOpenChange={setMenuOpen} />
    </div>
  );
}

function TopNav({ shell, compactOnMobile }: { shell: Shell; compactOnMobile: boolean }) {
  const navRef = useRef<HTMLElement>(null);
  const activeKey = shell.nav.items.find((item) => item.isActive)?.key;
  const indicator = useActiveIndicator(navRef, '[aria-current="page"] [data-nav-label]', `${shell.workspace}:${activeKey}`);
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border bg-background/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur",
        compactOnMobile ? "block" : "hidden md:block",
      )}
    >
      <div className="mx-auto grid h-16 max-w-[1400px] grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-8 md:h-20 md:grid-cols-[auto_1fr_auto] lg:grid-cols-[1fr_auto_1fr]">
        {shell.nav.home({
          className: "flex w-fit items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
          children: <BrandLogo />,
        })}
        <nav
          ref={navRef}
          aria-label={workspaceIdentity(shell).title}
          className="relative hidden h-full items-center justify-center gap-0.5 md:flex lg:gap-1"
        >
          {shell.nav.items.map((item) => (
            <span key={item.key} className="contents">
              {item.render({
                "aria-current": item.isActive ? "page" : undefined,
                className: cn(
                  "press flex h-11 items-center rounded-full px-3 text-sm whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring lg:px-4 lg:text-[15px]",
                  item.isActive
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                ),
                children: <span data-nav-label>{item.shortLabel}</span>,
              })}
            </span>
          ))}
          {indicator ? (
            <span
              aria-hidden
              className="nav-indicator pointer-events-none absolute bottom-0 left-0 h-[3px] w-px bg-primary"
              data-instant={indicator.instant ? "" : undefined}
              style={{ transform: `translateX(${indicator.left}px) scaleX(${indicator.width})` }}
            />
          ) : null}
        </nav>
        <div className="flex items-center justify-end">
          <AccountMenu shell={shell} />
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
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background",
        className,
      )}
    >
      {getInitials(shell.name)}
    </span>
  );
}

function workspaceLink(option: WorkspaceOption, props: { className?: string; children?: React.ReactNode }) {
  if (option.key === "hotel") return <Link {...option.destination} {...props} />;
  return <Link to={option.to} {...props} />;
}

function switchLink(option: HotelSwitchOption, props: { className?: string; children?: React.ReactNode }) {
  return <Link to={option.to} params={option.params} {...props} />;
}

/** Desktop workspace pill: switch hotel or workspace, account, sign out. */
function AccountMenu({ shell }: { shell: Shell }) {
  const identity = workspaceIdentity(shell);
  const organization = shell.context?.membership.organization;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="press flex h-11 max-w-[min(22rem,60vw)] items-center gap-2.5 rounded-full border border-border pr-1.5 pl-3 outline-none hover:shadow-raised focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Account and workspaces"
      >
        {identity.showInPill ? (
          <span className="hidden min-w-0 items-center gap-2 lg:flex">
            {shell.workspace === "hotel" && shell.coverUrl ? (
              <img src={shell.coverUrl} alt="" className="-ml-1.5 size-8 shrink-0 rounded-full object-cover" />
            ) : null}
            <span className="truncate text-sm font-medium">{identity.title}</span>
          </span>
        ) : null}
        <Menu className="size-4 shrink-0" aria-hidden />
        <Avatar shell={shell} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {shell.workspace === "hotel" ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{organization ? `Signed in to ${organization.name}` : "Hotels"}</DropdownMenuLabel>
              {shell.switchOptions.map((option) => (
                <DropdownMenuItem key={option.key} render={switchLink(option, {})}>
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.isActive ? <Check className="size-4 text-foreground" aria-label="Current" /> : null}
                </DropdownMenuItem>
              ))}
              {organization ? (
                <DropdownMenuItem
                  render={<Link to="/hotel/$organizationSlug" params={{ organizationSlug: organization.slug }} />}
                >
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
          </>
        ) : null}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {shell.workspaces.map((option) => (
            <DropdownMenuItem key={option.key} render={workspaceLink(option, {})}>
              <WorkspaceIcon option={option} />
              <span className="flex-1">{option.label}</span>
              {option.isActive ? <Check className="size-4 text-foreground" aria-label="Current" /> : null}
            </DropdownMenuItem>
          ))}
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

function WorkspaceIcon({ option, className }: { option: WorkspaceOption; className?: string }) {
  const Icon = option.key === "hotel" ? Building2 : option.key === "platform" ? ShieldCheck : UserRound;
  return <Icon aria-hidden className={cn("size-4", className)} />;
}

function MenuRow({
  icon,
  label,
  detail,
  active,
  render,
  onClick,
}: {
  icon?: React.ReactNode;
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
      {icon}
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[15px]", active && "font-semibold")}>{label}</span>
        {detail ? <span className="block truncate text-sm text-muted-foreground">{detail}</span> : null}
      </span>
      {active ? (
        <Check className="size-4 shrink-0 text-foreground" aria-label="Current" />
      ) : (
        <ChevronRight className="size-4 shrink-0 text-subtle-foreground" aria-hidden />
      )}
    </>
  );
  return (
    <li>
      {render ? (
        render({ className, children })
      ) : (
        <button type="button" className={className} onClick={onClick}>
          {children}
        </button>
      )}
    </li>
  );
}

const rowIcon = (Icon: LucideIcon) => <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />;

/** Phone "Menu" tab: pages without a tab, the hotel switcher, workspaces and account. */
function MenuSheet({
  shell,
  open,
  onOpenChange,
}: {
  shell: Shell;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const identity = workspaceIdentity(shell);
  const organization = shell.context?.membership.organization;
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Menu">
      <div className="grid gap-6">
        <div className="flex items-center gap-3">
          {shell.workspace === "hotel" && shell.coverUrl ? (
            <img src={shell.coverUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
          ) : shell.workspace === "personal" ? (
            <Avatar shell={shell} className="size-14 text-base" />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight">{identity.title}</p>
            {identity.detail ? <p className="truncate text-sm text-muted-foreground">{identity.detail}</p> : null}
          </div>
        </div>

        {shell.nav.overflow.length ? (
          <ul className="divide-y divide-border-soft border-y border-border-soft">
            {shell.nav.overflow.map((item) => (
              <MenuRow
                key={item.key}
                icon={rowIcon(item.icon)}
                label={item.label}
                active={item.isActive}
                render={(props) => item.render(props)}
              />
            ))}
          </ul>
        ) : null}

        {shell.workspace === "hotel" ? (
          <section>
            <h3 className="mb-1 text-xs text-subtle-foreground">Hotels</h3>
            <ul className="divide-y divide-border-soft">
              {shell.switchOptions.length > 1
                ? shell.switchOptions.map((option) => (
                    <MenuRow
                      key={option.key}
                      label={option.label}
                      active={option.isActive}
                      render={(props) => switchLink(option, props)}
                    />
                  ))
                : null}
              {organization ? (
                <MenuRow
                  icon={rowIcon(Building2)}
                  label="Manage properties"
                  render={(props) => (
                    <Link to="/hotel/$organizationSlug" params={{ organizationSlug: organization.slug }} {...props} />
                  )}
                />
              ) : null}
              <MenuRow icon={rowIcon(Building2)} label="All hotels" render={(props) => <Link to="/hotel" {...props} />} />
            </ul>
          </section>
        ) : null}

        {shell.workspaces.length > 1 ? (
          <section>
            <h3 className="mb-1 text-xs text-subtle-foreground">Workspaces</h3>
            <ul className="divide-y divide-border-soft">
              {shell.workspaces.map((option) => (
                <MenuRow
                  key={option.key}
                  icon={<WorkspaceIcon option={option} className="size-5 shrink-0 text-muted-foreground" />}
                  label={option.label}
                  detail={option.detail}
                  active={option.isActive}
                  render={(props) => workspaceLink(option, props)}
                />
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h3 className="mb-1 text-xs text-subtle-foreground">Account</h3>
          <ul className="divide-y divide-border-soft">
            <MenuRow
              icon={rowIcon(Settings)}
              label="Account settings"
              detail={shell.name}
              active={shell.accountActive}
              render={(props) => <Link to="/settings" {...props} />}
            />
            <MenuRow icon={rowIcon(LogOut)} label="Sign out" onClick={shell.signOut} />
          </ul>
        </section>
      </div>
    </BottomSheet>
  );
}
