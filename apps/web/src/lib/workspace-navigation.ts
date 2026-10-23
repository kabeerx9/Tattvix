import type { MeResponse } from "@tattvix/contracts";

export type Workspace = "personal" | "hotel" | "platform";
export type HotelDestination =
  | { to: "/hotel"; params?: undefined }
  | {
      to: "/hotel/$organizationSlug";
      params: { organizationSlug: string; propertySlug?: undefined };
    }
  | {
      to: "/hotel/$organizationSlug/$propertySlug/dashboard";
      params: { organizationSlug: string; propertySlug: string };
    };

export function getActiveWorkspace(pathname: string): Workspace {
  if (pathname === "/admin" || pathname.startsWith("/admin/"))
    return "platform";
  if (
    pathname === "/hotel" ||
    pathname.startsWith("/hotel/") ||
    ["/dashboard", "/reservations", "/guests", "/rooms"].includes(pathname)
  )
    return "hotel";
  return "personal";
}

// URL context can select only scopes present in the authenticated /me response.
export function getHotelDestination(
  user: MeResponse | null,
  pathname: string,
): HotelDestination {
  const [prefix, organizationSlug, propertySlug] = pathname
    .split("/")
    .filter(Boolean);
  const accessible =
    user?.memberships.filter((item) =>
      item.permissions.includes("hotel:view"),
    ) ?? [];
  const membership =
    accessible.find(
      (item) =>
        prefix === "hotel" && item.organization.slug === organizationSlug,
    ) ?? accessible[0];
  if (!membership) return { to: "/hotel" };
  const property =
    membership.properties.find(
      (item) => prefix === "hotel" && item.slug === propertySlug,
    ) ?? membership.properties[0];
  if (!property)
    return {
      to: "/hotel/$organizationSlug",
      params: { organizationSlug: membership.organization.slug },
    };
  return {
    to: "/hotel/$organizationSlug/$propertySlug/dashboard",
    params: {
      organizationSlug: membership.organization.slug,
      propertySlug: property.slug,
    },
  };
}

export type HotelMembership = MeResponse["memberships"][number];
export type HotelProperty = HotelMembership["properties"][number];
export type ActiveHotelContext = {
  membership: HotelMembership;
  property: HotelProperty | null;
};

// Unlike getHotelDestination, never falls back to another membership: this
// answers "which hotel is the user looking at", which may be none.
export function getActiveHotelContext(
  user: MeResponse | null,
  pathname: string,
): ActiveHotelContext | null {
  const [prefix, organizationSlug, propertySlug] = pathname
    .split("/")
    .filter(Boolean);
  if (prefix !== "hotel" || !organizationSlug) return null;
  const membership = user?.memberships.find(
    (item) =>
      item.permissions.includes("hotel:view") &&
      item.organization.slug === organizationSlug,
  );
  if (!membership) return null;
  const property =
    membership.properties.find((item) => item.slug === propertySlug) ?? null;
  return { membership, property };
}

export type HotelNavKey =
  | "overview"
  | "stays"
  | "rooms"
  | "guests"
  | "reports"
  | "settings";
export type HotelNavRoute =
  | "/hotel/$organizationSlug/$propertySlug/dashboard"
  | "/hotel/$organizationSlug/$propertySlug/stays"
  | "/hotel/$organizationSlug/$propertySlug/rooms"
  | "/hotel/$organizationSlug/$propertySlug/guests"
  | "/hotel/$organizationSlug/$propertySlug/reports"
  | "/hotel/$organizationSlug/$propertySlug/details";
export type HotelNavItem = {
  key: HotelNavKey;
  label: string;
  /** Label for tight spaces: the top nav tabs and the mobile tab bar. */
  shortLabel: string;
  to: HotelNavRoute;
  isActive: boolean;
};

const hotelNav: {
  key: HotelNavKey;
  label: string;
  shortLabel?: string;
  segment: string;
}[] = [
  { key: "overview", label: "Today", segment: "dashboard" },
  { key: "stays", label: "Stays", segment: "stays" },
  { key: "rooms", label: "Rooms", segment: "rooms" },
  { key: "guests", label: "Guests", segment: "guests" },
  { key: "reports", label: "Reports", segment: "reports" },
  { key: "settings", label: "Property settings", shortLabel: "Settings", segment: "details" },
];

export function getHotelNavItems(
  context: ActiveHotelContext,
  pathname: string,
): HotelNavItem[] {
  if (!context.property) return [];
  const activeSegment = pathname.split("/").filter(Boolean)[3];
  const canViewReports = context.membership.permissions.includes("reports:view");
  return hotelNav
    .filter((item) => item.key !== "reports" || canViewReports)
    .map((item) => ({
      key: item.key,
      label: item.label,
      shortLabel: item.shortLabel ?? item.label,
      to: `/hotel/$organizationSlug/$propertySlug/${item.segment}` as HotelNavRoute,
      isActive: item.segment === activeSegment,
    }));
}

/** Pages that get their own tab in the mobile bottom tab bar, per workspace. */
const hotelTabKeys: readonly HotelNavKey[] = ["overview", "stays", "rooms", "guests"];

/**
 * Splits a workspace nav for the mobile bottom tab bar: the everyday pages
 * in `tabKeys` get a tab, everything else lives behind "Menu". `menuActive`
 * lights the Menu tab when one of those pages is open, so the bar always
 * shows where the user is.
 */
export function splitNavForTabBar<Item extends { key: string; isActive: boolean }>(
  items: Item[],
  tabKeys: readonly Item["key"][],
): { tabs: Item[]; overflow: Item[]; menuActive: boolean } {
  const tabs = items.filter((item) => tabKeys.includes(item.key));
  const overflow = items.filter((item) => !tabKeys.includes(item.key));
  return { tabs, overflow, menuActive: overflow.some((item) => item.isActive) };
}

/** Hotel staff: Today, Stays, Rooms and Guests get tabs; reports and property settings go to Menu. */
export function splitHotelNavForTabBar(items: HotelNavItem[]) {
  return splitNavForTabBar(items, hotelTabKeys);
}

export type PersonalNavKey =
  | "overview"
  | "stays"
  | "profile"
  | "companions"
  | "privacy"
  | "register";
export type PersonalNavItem = {
  key: PersonalNavKey;
  label: string;
  shortLabel: string;
  to: "/guest" | "/stays" | "/profile" | "/companions" | "/privacy" | "/register-hotel";
  isActive: boolean;
};

const personalNav: Omit<PersonalNavItem, "isActive">[] = [
  { key: "overview", label: "Overview", shortLabel: "Overview", to: "/guest" },
  { key: "stays", label: "My stays", shortLabel: "Stays", to: "/stays" },
  { key: "profile", label: "Travel profile", shortLabel: "Profile", to: "/profile" },
  { key: "companions", label: "Companions", shortLabel: "Companions", to: "/companions" },
  { key: "privacy", label: "Privacy center", shortLabel: "Privacy", to: "/privacy" },
  { key: "register", label: "Register hotel", shortLabel: "Register hotel", to: "/register-hotel" },
];

const isAtOrUnder = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

/** The personal (guest) workspace. Account settings live in the account menu, not here. */
export function getPersonalNavItems(pathname: string): PersonalNavItem[] {
  return personalNav.map((item) => ({ ...item, isActive: isAtOrUnder(pathname, item.to) }));
}

const personalTabKeys: readonly PersonalNavKey[] = ["overview", "stays", "profile", "companions"];

/** Guests: Overview, Stays, Profile and Companions get tabs; privacy and hotel registration go to Menu. */
export function splitPersonalNavForTabBar(items: PersonalNavItem[]) {
  return splitNavForTabBar(items, personalTabKeys);
}

export type PlatformNavKey = "hotels" | "requests";
export type PlatformNavItem = {
  key: PlatformNavKey;
  label: string;
  shortLabel: string;
  to: "/admin" | "/admin/requests";
  isActive: boolean;
};

/**
 * Platform admin. "Hotels" stays lit on the pages reached from the
 * portfolio (an organization, oversight, onboarding); requests are separate.
 */
export function getPlatformNavItems(pathname: string): PlatformNavItem[] {
  const onRequests = isAtOrUnder(pathname, "/admin/requests");
  return [
    {
      key: "hotels",
      label: "Hotels",
      shortLabel: "Hotels",
      to: "/admin",
      isActive: isAtOrUnder(pathname, "/admin") && !onRequests,
    },
    {
      key: "requests",
      label: "Hotel requests",
      shortLabel: "Requests",
      to: "/admin/requests",
      isActive: onRequests,
    },
  ];
}

/** Platform admins have two pages; both get a tab. */
export function splitPlatformNavForTabBar(items: PlatformNavItem[]) {
  return splitNavForTabBar(items, ["hotels", "requests"]);
}

/** Account pages live in the account menu (and the phone Menu sheet) in every workspace. */
export function isAccountPath(pathname: string) {
  return pathname === "/settings" || pathname === "/account";
}

export type WorkspaceOption =
  | { key: "personal"; label: string; detail: string; isActive: boolean; to: "/guest" }
  | { key: "hotel"; label: string; detail: string; isActive: boolean; destination: HotelDestination }
  | { key: "platform"; label: string; detail: string; isActive: boolean; to: "/admin" };

/**
 * Workspaces the user may switch to, in a fixed order. Hotel needs
 * hotel:view on some membership and platform needs platform:admin, the
 * same checks the route guards apply, so the switcher never offers a
 * workspace that would redirect to /unauthorized.
 */
export function getWorkspaceOptions(
  user: MeResponse | null,
  pathname: string,
): WorkspaceOption[] {
  const active = getActiveWorkspace(pathname);
  const options: WorkspaceOption[] = [
    {
      key: "personal",
      label: "Personal",
      detail: "Stays, documents and privacy",
      isActive: active === "personal",
      to: "/guest",
    },
  ];
  if (user?.memberships.some((item) => item.permissions.includes("hotel:view"))) {
    options.push({
      key: "hotel",
      label: "Hotel",
      detail: "Front desk and property",
      isActive: active === "hotel",
      destination: getHotelDestination(user, pathname),
    });
  }
  if (user?.platformPermissions.includes("platform:admin")) {
    options.push({
      key: "platform",
      label: "Platform admin",
      detail: "Every hotel on Tattwix",
      isActive: active === "platform",
      to: "/admin",
    });
  }
  return options;
}

export type HotelSwitchOption =
  | {
      key: string;
      label: string;
      isActive: boolean;
      to: "/hotel/$organizationSlug/$propertySlug/dashboard";
      params: { organizationSlug: string; propertySlug: string };
    }
  | {
      key: string;
      label: string;
      isActive: boolean;
      to: "/hotel/$organizationSlug";
      params: { organizationSlug: string };
    };

/**
 * Every property the user can open, for the hotel switcher. Organizations
 * without properties link to their setup page. Only memberships with
 * hotel:view are listed.
 */
export function getHotelSwitchOptions(
  user: MeResponse | null,
  context: ActiveHotelContext | null,
): HotelSwitchOption[] {
  const memberships =
    user?.memberships.filter((item) => item.permissions.includes("hotel:view")) ?? [];
  return memberships.flatMap((membership): HotelSwitchOption[] =>
    membership.properties.length === 0
      ? [
          {
            key: `org-${membership.id}`,
            label: membership.organization.name,
            isActive: context?.membership.id === membership.id && !context.property,
            to: "/hotel/$organizationSlug",
            params: { organizationSlug: membership.organization.slug },
          },
        ]
      : membership.properties.map((property) => ({
          key: `prop-${property.id}`,
          label:
            property.name === membership.organization.name
              ? property.name
              : `${membership.organization.name} · ${property.name}`,
          isActive:
            context?.membership.id === membership.id && context.property?.id === property.id,
          to: "/hotel/$organizationSlug/$propertySlug/dashboard",
          params: {
            organizationSlug: membership.organization.slug,
            propertySlug: property.slug,
          },
        })),
  );
}
