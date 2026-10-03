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
