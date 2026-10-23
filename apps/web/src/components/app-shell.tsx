// The one app shell for every signed-in workspace (personal, hotel staff,
// platform admin), per docs/adr/0003-host-shell-and-accent-restraint.md:
// a sticky top nav from `md` up and a bottom tab bar with a Menu sheet on
// phones. Switching between places (Personal, each hotel, Platform admin)
// is one control: the place pill at the far left on desktop, the first tab
// on phones, ⌘K anywhere. Which pages a workspace has and who may switch
// where is decided by the pure functions in lib/workspace-navigation.ts and
// lib/workspace-switcher.ts; this file only renders that model.
import { useClerk, useUser } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useRouteContext } from "@tanstack/react-router";
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  ChevronsUpDown,
  ClipboardCheck,
  ClipboardList,
  Contact,
  IdCard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BrandLogo, BrandMark } from "@/components/brand";
import { BottomTabBar } from "@/components/design-system";
import { PlaceCue, PlaceList, PlacePill, PlacePopover, PlaceThumb, placeIdentity, type PlacePerson } from "@/components/place-switcher";
import { propertyPhotoQueries } from "@/features/property-photos/queries";
import { getInitials } from "@/lib/initials";
import {
  getActiveHotelContext,
  getActiveWorkspace,
  getHotelNavItems,
  getPersonalNavItems,
  getPlatformNavItems,
  isAccountPath,
  splitHotelNavForTabBar,
  splitPersonalNavForTabBar,
  splitPlatformNavForTabBar,
  type ActiveHotelContext,
  type Workspace,
} from "@/lib/workspace-navigation";
import {
  getCurrentPlace,
  getSwitchPlaces,
  hasPlaceSwitcher,
  isHotelPlace,
  makeRoomForPlaceTab,
  pushRecentPlace,
  readRecentPlaceKeys,
  writeRecentPlaceKeys,
  type Place,
} from "@/lib/workspace-switcher";

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


/**
 * Recently opened hotel places for this user, newest first. Stored per user
 * id in localStorage as place keys only; the list is re-filtered against
 * the current memberships every time it is shown.
 */
function useRecentPlaces(userId: number | undefined, current: Place | null) {
  const [keys, setKeys] = useState<string[]>(() => (userId ? readRecentPlaceKeys(userId) : []));
  const currentKey = current && isHotelPlace(current) ? current.key : null;
  useEffect(() => {
    if (!userId || !currentKey) return;
    setKeys((previous) => {
      const next = pushRecentPlace(previous, currentKey);
      writeRecentPlaceKeys(userId, next);
      return next;
    });
  }, [userId, currentKey]);
  return keys;
}

function useAppShell() {
  const { pathname } = useLocation();
  const { auth } = useRouteContext({ from: "__root__" });
  const { user } = useUser();
  const { signOut } = useClerk();
  const me = auth.currentUser;
  const workspace = getActiveWorkspace(pathname);
  const context = workspace === "hotel" ? getActiveHotelContext(me, pathname) : null;
  const { data: photos } = useQuery({
    ...propertyPhotoQueries.list(context?.membership.organization.slug ?? "", context?.property?.slug ?? ""),
    enabled: Boolean(context?.property),
  });
  const places = useMemo(() => getSwitchPlaces(me), [me]);
  const currentPlace = getCurrentPlace(places, me, pathname);
  const recentKeys = useRecentPlaces(me?.id, currentPlace);
  const name =
    user?.fullName ||
    [me?.firstName, me?.lastName].filter(Boolean).join(" ") ||
    user?.primaryEmailAddress?.emailAddress ||
    me?.email ||
    "Signed in";
  return {
    pathname,
    workspace,
    context,
    nav: resolveNav(workspace, context, pathname),
    accountActive: isAccountPath(pathname),
    coverUrl: photos?.cover?.url,
    places,
    currentPlace,
    recentKeys,
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

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);

/** The shell's markup, driven by a plain model (also usable from UI fixtures). */
export function AppShellView({ shell, children }: { shell: AppShellModel; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cue, setCue] = useState<{ id: number; label: string } | null>(null);
  const switcher = hasPlaceSwitcher(shell.places);
  const person: PlacePerson = { name: shell.name, imageUrl: shell.imageUrl };
  const currentKey = shell.currentPlace?.key ?? null;

  // Close every sheet and popover on any navigation (links, back/forward, redirects).
  useEffect(() => {
    setMenuOpen(false);
    setPopoverOpen(false);
    setSheetOpen(false);
  }, [shell.pathname]);

  // The content fades and rises once when the place changes, not on first paint.
  const [swap, setSwap] = useState({ key: currentKey, count: 0 });
  if (swap.key !== currentKey) setSwap({ key: currentKey, count: swap.count + 1 });

  // ⌘K / Ctrl+K opens the switcher from anywhere except while typing.
  useEffect(() => {
    if (!switcher) return;
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k" || isEditable(event.target)) return;
      event.preventDefault();
      if (window.matchMedia("(min-width: 768px)").matches) setPopoverOpen((value) => !value);
      else setSheetOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [switcher]);

  const onPick = useCallback((place: Place) => {
    setPopoverOpen(false);
    setSheetOpen(false);
    if (place.key !== currentKey) setCue({ id: Date.now(), label: `${placeLabel(place)} · ${place.homeLabel}` });
  }, [currentKey]);

  const nav = switcher ? { ...shell.nav, ...makeRoomForPlaceTab(shell.nav) } : shell.nav;
  const hasTabBar = nav.tabs.length > 0;
  const identity = placeIdentity(shell.currentPlace, person);

  const list = (autoFocus: boolean) => (
    <PlaceList
      places={shell.places}
      currentKey={currentKey}
      recentKeys={shell.recentKeys}
      person={person}
      autoFocus={autoFocus}
      onPick={onPick}
    />
  );

  return (
    <div className="min-h-dvh bg-background pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)]">
      <TopNav
        shell={shell}
        person={person}
        switcher={switcher}
        popoverOpen={popoverOpen}
        setPopoverOpen={setPopoverOpen}
        list={list(true)}
      />
      <PhoneTopBar shell={shell} person={person} switcher={switcher} showAccount={!hasTabBar} onOpen={() => setSheetOpen(true)} />
      <main
        className={cn(
          "mx-auto w-full max-w-[1400px] px-4 pt-4 sm:px-8 md:pt-8",
          hasTabBar ? "pb-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom,0px)+24px)] md:pb-12" : "pb-12",
        )}
      >
        <div key={swap.count} className={swap.count ? "place-swap" : undefined}>
          {children}
        </div>
      </main>
      {hasTabBar ? (
        <BottomTabBar
          label={identity.title}
          items={[
            ...(switcher
              ? [
                  {
                    key: "place",
                    label: shortPlaceLabel(shell.currentPlace),
                    ariaLabel: `${identity.title}. Switch place`,
                    icon: Building2,
                    media: (
                      <PlaceThumb
                        place={shell.currentPlace}
                        person={person}
                        coverUrl={shell.coverUrl}
                        className="size-6 rounded-md text-[9px]"
                      />
                    ),
                    isActive: false,
                    onClick: () => setSheetOpen(true),
                  },
                ]
              : []),
            ...nav.tabs.map((item) => ({
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
              isActive: nav.menuActive || shell.accountActive || menuOpen,
              onClick: () => setMenuOpen(true),
            },
          ]}
        />
      ) : null}
      <MenuSheet shell={shell} overflow={nav.overflow} open={menuOpen} onOpenChange={setMenuOpen} />
      {switcher ? (
        <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Switch to" className="min-h-[70dvh]">
          {list(true)}
          <ManageProperties shell={shell} onNavigate={() => setSheetOpen(false)} />
        </BottomSheet>
      ) : null}
      <PlaceCue cue={cue} />
    </div>
  );
}

function placeLabel(place: Place) {
  return place.kind === "personal" ? "Personal" : place.label;
}

/** The phone tab's label: short enough for a fifth of a phone. */
function shortPlaceLabel(place: Place | null) {
  if (!place) return "Hotels";
  if (place.kind === "personal") return "Personal";
  if (place.kind === "platform") return "Admin";
  return place.label;
}

/** The organization's property list, reached from inside a hotel. Routes still check access. */
function ManageProperties({ shell, onNavigate }: { shell: Shell; onNavigate?: () => void }) {
  const organization = shell.context?.membership.organization;
  if (!organization) return null;
  return (
    <div className="mt-2 border-t border-border-soft pt-2">
      <Link
        to="/hotel/$organizationSlug"
        params={{ organizationSlug: organization.slug }}
        onClick={onNavigate}
        className="press flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Building2 className="size-4 shrink-0" aria-hidden />
        <span className="truncate">Manage {organization.name} properties</span>
      </Link>
    </div>
  );
}

/** Guest-only accounts get no switcher, just this quiet way in. */
function ListYourHotel({ className }: { className?: string }) {
  return (
    <Link
      to="/register-hotel"
      className={cn(
        "press flex h-10 items-center rounded-full px-3 text-sm font-medium whitespace-nowrap outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      List your hotel
    </Link>
  );
}

function TopNav({
  shell,
  person,
  switcher,
  popoverOpen,
  setPopoverOpen,
  list,
}: {
  shell: Shell;
  person: PlacePerson;
  switcher: boolean;
  popoverOpen: boolean;
  setPopoverOpen: (open: boolean | ((open: boolean) => boolean)) => void;
  list: React.ReactNode;
}) {
  const navRef = useRef<HTMLElement>(null);
  const activeKey = shell.nav.items.find((item) => item.isActive)?.key;
  const indicator = useActiveIndicator(
    navRef,
    '[aria-current="page"] [data-nav-label]',
    `${shell.currentPlace?.key ?? shell.workspace}:${activeKey}`,
  );
  const close = useCallback(() => setPopoverOpen(false), [setPopoverOpen]);
  return (
    <header className="sticky top-0 z-30 hidden border-b border-border bg-background/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur md:block">
      {/* With a place pill, the section links take their own row below lg so neither gets squeezed. */}
      <div className={cn("mx-auto flex max-w-[1400px] items-center gap-x-3 px-8", switcher ? "flex-wrap lg:h-20 lg:flex-nowrap" : "h-20")}>
        {switcher ? (
          <div className="flex h-16 min-w-0 flex-1 items-center gap-3 lg:h-auto">
            {shell.nav.home({
              className: "shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
              children: (
                <>
                  <BrandMark className="size-7" />
                  <span className="sr-only">Tattwix home</span>
                </>
              ),
            })}
            <PlacePopover
              open={popoverOpen}
              onClose={close}
              trigger={
                <PlacePill
                  place={shell.currentPlace}
                  person={person}
                  coverUrl={shell.coverUrl}
                  open={popoverOpen}
                  onToggle={() => setPopoverOpen((value) => !value)}
                />
              }
            >
              {popoverOpen ? list : null}
              <ManageProperties shell={shell} onNavigate={close} />
              <p className="mt-2 border-t border-border-soft px-2 pt-2.5 text-xs text-subtle-foreground">
                ↑↓ to move · ↵ to open · ⌘K from anywhere
              </p>
            </PlacePopover>
          </div>
        ) : (
          <div className="flex shrink-0 lg:flex-1">
            {shell.nav.home({
              className: "flex w-fit items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
              children: <BrandLogo />,
            })}
          </div>
        )}
        <nav
          ref={navRef}
          aria-label="Sections"
          className={cn(
            "relative flex min-w-0 items-center gap-0.5 lg:gap-1",
            switcher ? "order-last h-12 basis-full max-lg:-ml-2.5 lg:order-none lg:mx-auto lg:h-full lg:basis-auto lg:justify-center" : "mx-auto h-full justify-center",
          )}
        >
          {shell.nav.items.map((item) => (
            <span key={item.key} className="contents">
              {item.render({
                "aria-current": item.isActive ? "page" : undefined,
                className: cn(
                  "press flex h-11 items-center rounded-full px-2.5 text-sm whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring lg:px-4 lg:text-[15px]",
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
        <div className="flex shrink-0 items-center justify-end gap-2 lg:flex-1">
          {!switcher ? <ListYourHotel /> : null}
          <AccountMenu shell={shell} />
        </div>
      </div>
    </header>
  );
}

/** Phones: the current place (or the logo for guests), scrolling with the page. */
function PhoneTopBar({
  shell,
  person,
  switcher,
  showAccount,
  onOpen,
}: {
  shell: Shell;
  person: PlacePerson;
  switcher: boolean;
  /** Without a tab bar (a hotel with no property yet) there is no Menu tab, so account lives here. */
  showAccount: boolean;
  onOpen: () => void;
}) {
  const identity = placeIdentity(shell.currentPlace, person);
  return (
    <header className="border-b border-border-soft pt-[env(safe-area-inset-top,0px)] md:hidden">
      <div className="flex h-14 items-center gap-2 px-3">
        {switcher ? (
          <button
            type="button"
            onClick={onOpen}
            aria-haspopup="dialog"
            aria-label={`${identity.title}. Switch place`}
            className="press flex min-w-0 items-center gap-2 rounded-full py-1 pr-3 pl-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PlaceThumb place={shell.currentPlace} person={person} coverUrl={shell.coverUrl} className="size-8 rounded-full" />
            <span className="truncate text-[15px] font-semibold">{identity.title}</span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        ) : (
          <>
            {shell.nav.home({
              className: "flex items-center rounded-lg pl-1 outline-none focus-visible:ring-2 focus-visible:ring-ring",
              children: <BrandLogo size="sm" />,
            })}
            <span className="flex-1" />
            <ListYourHotel />
          </>
        )}
        {showAccount ? (
          <div className="ml-auto shrink-0">
            <AccountMenu shell={shell} />
          </div>
        ) : null}
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

/** Account only: settings and sign out. Switching lives in the place pill. */
function AccountMenu({ shell }: { shell: Shell }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="press flex h-11 items-center gap-2 rounded-full border border-border pr-1.5 pl-3 outline-none hover:shadow-raised focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Account"
      >
        <Menu className="size-4 shrink-0" aria-hidden />
        <Avatar shell={shell} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{shell.name}</p>
        </div>
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

/** Phone "Menu" tab: pages without a tab, then account. Switching is the first tab, not here. */
function MenuSheet({
  shell,
  overflow,
  open,
  onOpenChange,
}: {
  shell: Shell;
  overflow: ShellNavEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Menu">
      <div className="grid gap-6">
        {overflow.length ? (
          <ul className="divide-y divide-border-soft border-y border-border-soft">
            {overflow.map((item) => (
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
