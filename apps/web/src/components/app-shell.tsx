// The one app shell for every signed-in workspace (personal, hotel staff,
// platform admin), per docs/adr/0003-host-shell-and-accent-restraint.md:
// a sticky top nav from `md` up and a bottom tab bar with a Menu sheet on
// phones. Where you are and who you are is one control: the pill at the
// top-right on desktop (current place + avatar), the first tab on phones,
// ⌘K anywhere. It opens one panel: the account, the places to switch to
// (Personal, each hotel, Platform admin), then account actions. Which pages a workspace has and who may switch
// where is decided by the pure functions in lib/workspace-navigation.ts and
// lib/workspace-switcher.ts; this file only renders that model.
import { useClerk, useUser } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useRouteContext } from "@tanstack/react-router";
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
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
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BrandLogo } from "@/components/brand";
import { BottomTabBar } from "@/components/design-system";
import {
  AccountPill,
  PersonAvatar,
  PlaceCue,
  PlaceList,
  PlacePopover,
  PlaceThumb,
  placeIdentity,
  shortPlaceLabel,
  type PlacePerson,
} from "@/components/place-switcher";
import { hotelRegistrationQueries } from "@/features/hotel-registration/queries";
import { hasPendingHotelRequest } from "@/features/hotel-registration/status";
import { propertyPhotoQueries } from "@/features/property-photos/queries";
import { SubscriptionBanner } from "@/features/subscription/components/subscription-banner";
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
  // A pending hotel request turns "List your hotel" into its status. Only read
  // from cache (the register page loads it); the shell never fetches it.
  const { data: registrations } = useQuery({ ...hotelRegistrationQueries.guest(), enabled: false });
  const hotelRequestPending = hasPendingHotelRequest(registrations?.requests ?? []);
  const places = useMemo(() => getSwitchPlaces(me, { hotelRequestPending }), [me, hotelRequestPending]);
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
    email: user?.primaryEmailAddress?.emailAddress || me?.email || "",
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

  // ⌘K / Ctrl+K opens the account and switch panel from anywhere except while typing.
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
    if (place.key !== currentKey && place.kind !== "register") setCue({ id: Date.now(), label: `${placeLabel(place)} · ${place.homeLabel}` });
  }, [currentKey]);

  const nav = switcher ? { ...shell.nav, ...makeRoomForPlaceTab(shell.nav) } : shell.nav;
  const hasTabBar = nav.tabs.length > 0;
  const identity = placeIdentity(shell.currentPlace, person);

  const panel = (onNavigate: () => void) => (
    <AccountPanel shell={shell} person={person} onNavigate={onNavigate}>
      <PlaceList
        places={shell.places}
        currentKey={currentKey}
        recentKeys={shell.recentKeys}
        person={person}
        autoFocus
        onPick={onPick}
      />
    </AccountPanel>
  );

  return (
    <div className="min-h-dvh bg-background pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)]">
      <TopNav
        shell={shell}
        person={person}
        switcher={switcher}
        popoverOpen={popoverOpen}
        setPopoverOpen={setPopoverOpen}
        panel={popoverOpen ? panel(() => setPopoverOpen(false)) : null}
      />
      {/* Phones get a top bar only when there is no tab bar (a hotel with no property yet). */}
      {!hasTabBar ? <PhoneTopBar shell={shell} person={person} onOpen={() => setSheetOpen(true)} /> : null}
      {/* Hotel staff see their trial clock from day one; paid hotels see nothing. */}
      {shell.context ? <SubscriptionBanner subscription={shell.context.membership.subscription} /> : null}
      <main
        className={cn(
          "mx-auto w-full max-w-[1400px] px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:px-8 md:pt-8",
          hasTabBar ? "pb-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom,0px)+24px)] md:pb-12" : "pb-12 max-md:pt-4",
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
                    ariaLabel: `${identity.title}, signed in as ${shell.name}. Switch place or manage account`,
                    icon: Building2,
                    media: (
                      <PlaceThumb
                        place={shell.currentPlace}
                        person={person}
                        coverUrl={shell.coverUrl}
                        className="size-6 rounded-md text-[9px]"
                      />
                    ),
                    // Account pages live in this panel, so the tab lights up on them.
                    isActive: shell.accountActive,
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
            ...(nav.overflow.length
              ? [
                  {
                    key: "menu",
                    label: "Menu",
                    icon: Menu,
                    isActive: nav.menuActive || menuOpen,
                    onClick: () => setMenuOpen(true),
                  },
                ]
              : []),
          ]}
        />
      ) : null}
      <MenuSheet overflow={nav.overflow} open={menuOpen} onOpenChange={setMenuOpen} />
      {switcher ? (
        <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Account and places" className="min-h-[70dvh]">
          {sheetOpen ? panel(() => setSheetOpen(false)) : null}
        </BottomSheet>
      ) : null}
      <PlaceCue cue={cue} />
    </div>
  );
}

function placeLabel(place: Place) {
  return place.kind === "personal" ? "Personal" : place.label;
}

const panelRowClass =
  "press flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The one panel behind the top-right pill (and the phone's place tab):
 * who you are, where you can go, and account actions.
 */
function AccountPanel({
  shell,
  person,
  onNavigate,
  children,
}: {
  shell: Shell;
  person: PlacePerson;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  const organization = shell.context?.membership.organization;
  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="flex min-w-0 items-center gap-3 px-2 pt-1">
        <PersonAvatar person={person} className="size-10" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{shell.name}</p>
          {shell.email && shell.email !== shell.name ? (
            <p className="truncate text-sm text-muted-foreground">{shell.email}</p>
          ) : null}
        </div>
      </div>
      <section aria-label="Switch to" className="grid grid-cols-1 gap-1 border-t border-border-soft pt-3">
        <p className="px-2 text-xs text-subtle-foreground">Switch to</p>
        {children}
      </section>
      <ul className="grid grid-cols-1 border-t border-border-soft pt-2">
        {organization ? (
          <li>
            <Link
              to="/hotel/$organizationSlug"
              params={{ organizationSlug: organization.slug }}
              onClick={onNavigate}
              className={panelRowClass}
            >
              <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">Manage {organization.name} properties</span>
            </Link>
          </li>
        ) : null}
        <li>
          <Link to="/settings" onClick={onNavigate} className={cn(panelRowClass, shell.accountActive && "font-semibold")}>
            <Settings className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">Account settings</span>
          </Link>
        </li>
        <li>
          <button type="button" onClick={shell.signOut} className={panelRowClass}>
            <LogOut className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">Sign out</span>
          </button>
        </li>
      </ul>
      <p className="hidden border-t border-border-soft px-2 pt-2.5 text-xs text-subtle-foreground md:block">
        ↑↓ to move · ↵ to open · ⌘K from anywhere
      </p>
    </div>
  );
}

function TopNav({
  shell,
  person,
  switcher,
  popoverOpen,
  setPopoverOpen,
  panel,
}: {
  shell: Shell;
  person: PlacePerson;
  switcher: boolean;
  popoverOpen: boolean;
  setPopoverOpen: (open: boolean | ((open: boolean) => boolean)) => void;
  panel: React.ReactNode;
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
      {/* Below lg the section links take their own row so the pill never squeezes them. */}
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 px-8 lg:h-20 lg:flex-nowrap">
        <div className="flex h-16 min-w-0 flex-1 items-center lg:h-auto">
          {shell.nav.home({
            className: "flex w-fit items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
            children: <BrandLogo />,
          })}
        </div>
        <nav
          ref={navRef}
          aria-label="Sections"
          className="relative order-last flex h-12 min-w-0 basis-full items-center gap-0.5 max-lg:-ml-2.5 lg:order-none lg:mx-auto lg:h-full lg:basis-auto lg:justify-center lg:gap-1"
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
        <div className="flex h-16 min-w-0 flex-1 items-center justify-end lg:h-auto">
          {switcher ? (
            <PlacePopover
              open={popoverOpen}
              onClose={close}
              trigger={
                <AccountPill
                  place={shell.currentPlace}
                  person={person}
                  coverUrl={shell.coverUrl}
                  open={popoverOpen}
                  onToggle={() => setPopoverOpen((value) => !value)}
                />
              }
            >
              {panel}
            </PlacePopover>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/** Phones without a tab bar: the logo and the same combined control. */
function PhoneTopBar({ shell, person, onOpen }: { shell: Shell; person: PlacePerson; onOpen: () => void }) {
  return (
    <header className="border-b border-border-soft pt-[env(safe-area-inset-top,0px)] md:hidden">
      <div className="flex h-14 items-center justify-between gap-2 px-3">
        {shell.nav.home({
          className: "flex items-center rounded-lg pl-1 outline-none focus-visible:ring-2 focus-visible:ring-ring",
          children: <BrandLogo size="sm" />,
        })}
        <AccountPill place={shell.currentPlace} person={person} coverUrl={shell.coverUrl} open={false} onToggle={onOpen} />
      </div>
    </header>
  );
}

function MenuRow({
  icon,
  label,
  active,
  render,
}: {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  render: (props: { className: string; children: React.ReactNode }) => React.ReactElement;
}) {
  const className =
    "press flex min-h-14 w-full items-center gap-3 py-2 text-left outline-none focus-visible:bg-muted";
  const children = (
    <>
      {icon}
      <span className={cn("min-w-0 flex-1 truncate text-[15px]", active && "font-semibold")}>{label}</span>
      {active ? (
        <Check className="size-4 shrink-0 text-foreground" aria-label="Current" />
      ) : (
        <ChevronRight className="size-4 shrink-0 text-subtle-foreground" aria-hidden />
      )}
    </>
  );
  return <li>{render({ className, children })}</li>;
}

const rowIcon = (Icon: LucideIcon) => <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />;

/** Phone "Menu" tab: only the pages without a tab. Account and switching live in the place tab. */
function MenuSheet({
  overflow,
  open,
  onOpenChange,
}: {
  overflow: ShellNavEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Menu">
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
    </BottomSheet>
  );
}
