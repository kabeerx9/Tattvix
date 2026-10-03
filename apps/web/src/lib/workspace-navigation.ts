import type { MeResponse } from "@tattvix/contracts";

export type Workspace = "personal" | "hotel" | "platform";
type HotelDestination =
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
  to: HotelNavRoute;
  isActive: boolean;
};

const hotelNav: { key: HotelNavKey; label: string; segment: string }[] = [
  { key: "overview", label: "Overview", segment: "dashboard" },
  { key: "stays", label: "Stays", segment: "stays" },
  { key: "rooms", label: "Rooms", segment: "rooms" },
  { key: "guests", label: "Guests", segment: "guests" },
  { key: "reports", label: "Reports", segment: "reports" },
  { key: "settings", label: "Property settings", segment: "details" },
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
      to: `/hotel/$organizationSlug/$propertySlug/${item.segment}` as HotelNavRoute,
      isActive: item.segment === activeSegment,
    }));
}
