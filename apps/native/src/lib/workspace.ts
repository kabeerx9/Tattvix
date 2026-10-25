// The workspace model for the phone (decision: "single app workspace model",
// issue #43). Pure functions over the /me response: which hotels a person can
// open, where they land after sign-in, and whether a URL names a hotel they may
// see. Listing a place never grants access; the server still checks every call.
import type { MeResponse, Membership, Permission, Subscription } from "@tattvix/contracts";

export type HotelPlace = {
  /** `property:<id>`; ids only, so a stored last-used place never carries names. */
  key: string;
  organizationSlug: string;
  organizationName: string;
  propertySlug: string;
  propertyName: string;
  role: Membership["role"];
  permissions: readonly Permission[];
  subscription: Subscription;
};

export type Landing = { kind: "hotel"; place: HotelPlace } | { kind: "guest" };

const formatRole = (role: string) => role.charAt(0) + role.slice(1).toLowerCase();

/** Every property the person may open, in membership order. Organizations with no property yet are skipped: setup is web-only. */
export function getHotelPlaces(me: MeResponse | null): HotelPlace[] {
  if (!me) return [];
  const places: HotelPlace[] = [];
  for (const membership of me.memberships) {
    if (!membership.permissions.includes("hotel:view")) continue;
    for (const property of membership.properties) {
      places.push({
        key: `property:${property.id}`,
        organizationSlug: membership.organization.slug,
        organizationName: membership.organization.name,
        propertySlug: property.slug,
        propertyName: property.name,
        role: membership.role,
        permissions: membership.permissions,
        subscription: membership.subscription,
      });
    }
  }
  return places;
}

/** "Owner" or "Sunrise Hospitality · Owner" for the switcher's detail line. */
export function describeHotelPlace(place: HotelPlace) {
  const role = formatRole(place.role);
  return place.propertyName === place.organizationName ? role : `${place.organizationName} · ${role}`;
}

/**
 * Where a signed-in person lands: the hotel they used last if they still have
 * it, else their first hotel, else guest mode. A stale or unknown last-used key
 * falls through silently, since access can be revoked between visits.
 */
export function getLanding(me: MeResponse | null, lastUsedKey: string | null): Landing {
  const places = getHotelPlaces(me);
  if (places.length === 0) return { kind: "guest" };
  const remembered = lastUsedKey ? places.find((place) => place.key === lastUsedKey) : undefined;
  return { kind: "hotel", place: remembered ?? places[0]! };
}

/** The hotel a route names, or null when the person cannot open it. */
export function findHotelPlace(me: MeResponse | null, organizationSlug: string | undefined, propertySlug: string | undefined): HotelPlace | null {
  if (!organizationSlug || !propertySlug) return null;
  return getHotelPlaces(me).find((place) => place.organizationSlug === organizationSlug && place.propertySlug === propertySlug) ?? null;
}

export function hotelHref(place: Pick<HotelPlace, "organizationSlug" | "propertySlug">) {
  return `/(hotel)/${place.organizationSlug}/${place.propertySlug}` as const;
}

export function hasPermission(place: Pick<HotelPlace, "permissions">, permission: Permission) {
  return place.permissions.includes(permission);
}

/** Platform admins see the Tattwix-wide Platform screen; the server still checks every call. */
export function isPlatformAdmin(me: MeResponse | null) {
  return me?.platformPermissions.includes("platform:admin") ?? false;
}

/** Whether a hotel's writes are paused: an expired or missing subscription. */
export function isReadOnly(place: Pick<HotelPlace, "subscription">) {
  return !place.subscription.entitled;
}
