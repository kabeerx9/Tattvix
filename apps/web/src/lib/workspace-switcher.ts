// The place switcher's model: every place a signed-in user can open
// (their personal space, platform admin, each hotel property), how the
// switcher lists them, and where each one lands. Pure functions over the
// /me response, so the switcher only ever offers what the memberships
// allow. Listing a place never grants access: the routes still enforce
// permissions on arrival.
import type { MeResponse } from "@tattvix/contracts";

import { getActiveHotelContext, getActiveWorkspace } from "./workspace-navigation";

type Organization = MeResponse["memberships"][number]["organization"];

/** Where a place lands. Mirrors the router's typed `to`/`params` pairs. */
export type PlaceHome =
  | { to: "/stays"; params?: undefined }
  | { to: "/admin"; params?: undefined }
  | {
      to: "/hotel/$organizationSlug/$propertySlug/dashboard";
      params: { organizationSlug: string; propertySlug: string };
    }
  | { to: "/hotel/$organizationSlug"; params: { organizationSlug: string } }
  | { to: "/register-hotel"; params?: undefined };

export type Place =
  | { key: "personal"; kind: "personal"; label: string; detail: string; home: PlaceHome; homeLabel: string }
  | { key: "platform"; kind: "platform"; label: string; detail: string; home: PlaceHome; homeLabel: string }
  /** Not a place but the way to one: "List your hotel", or the pending request's status. */
  | { key: "register"; kind: "register"; label: string; detail: string; home: PlaceHome; homeLabel: string; pending: boolean }
  | {
      /** `property:<id>`. Ids only, so a stored recent never carries names. */
      key: string;
      kind: "property";
      label: string;
      detail: string;
      home: PlaceHome;
      homeLabel: string;
      organization: Organization;
      property: { id: number; name: string; slug: string };
      role: string;
    }
  | {
      /** `organization:<id>`: an organization with no property yet opens its setup page. */
      key: string;
      kind: "organization";
      label: string;
      detail: string;
      home: PlaceHome;
      homeLabel: string;
      organization: Organization;
      role: string;
    };

export type HotelPlace = Extract<Place, { kind: "property" | "organization" }>;

/** A list this long gets a search field, and Recent earns its own section. */
export const SWITCHER_SEARCH_THRESHOLD = 7;
export const MAX_RECENT_PLACES = 3;

const formatRole = (role: string) => role.charAt(0) + role.slice(1).toLowerCase();

export const isHotelPlace = (place: Place): place is HotelPlace =>
  place.kind === "property" || place.kind === "organization";

/**
 * Every place the user may open, in switcher order: Personal, Platform
 * admin (platform:admin only), then hotels in membership order. A hotel
 * membership counts only with hotel:view, the same check the hotel route
 * guard applies, so nothing listed here redirects to /unauthorized.
 * Someone with no hotel and no platform access gets a last "List your
 * hotel" entry instead (or "Hotel request pending" once they applied).
 */
export function getSwitchPlaces(user: MeResponse | null, options: { hotelRequestPending?: boolean } = {}): Place[] {
  if (!user) return [];
  const places: Place[] = [
    {
      key: "personal",
      kind: "personal",
      label: "Personal",
      detail: "My stays, my ID, check in somewhere",
      home: { to: "/stays" },
      homeLabel: "My stays",
    },
  ];
  if (user.platformPermissions.includes("platform:admin")) {
    places.push({
      key: "platform",
      kind: "platform",
      label: "Platform admin",
      detail: "Every hotel on Tattwix",
      home: { to: "/admin" },
      homeLabel: "Hotels",
    });
  }
  for (const membership of user.memberships) {
    if (!membership.permissions.includes("hotel:view")) continue;
    const role = formatRole(membership.role);
    const { organization } = membership;
    if (membership.properties.length === 0) {
      places.push({
        key: `organization:${organization.id}`,
        kind: "organization",
        label: organization.name,
        detail: "Set up your first property",
        home: { to: "/hotel/$organizationSlug", params: { organizationSlug: organization.slug } },
        homeLabel: "Setup",
        organization,
        role,
      });
      continue;
    }
    for (const property of membership.properties) {
      places.push({
        key: `property:${property.id}`,
        kind: "property",
        label: property.name,
        detail: property.name === organization.name ? role : `${organization.name} · ${role}`,
        home: {
          to: "/hotel/$organizationSlug/$propertySlug/dashboard",
          params: { organizationSlug: organization.slug, propertySlug: property.slug },
        },
        homeLabel: "Today",
        organization,
        property,
        role,
      });
    }
  }
  if (places.length === 1) {
    const pending = Boolean(options.hotelRequestPending);
    places.push({
      key: "register",
      kind: "register",
      label: pending ? "Hotel request pending" : "List your hotel",
      detail: pending ? "We will let you know when it is approved" : "Run a hotel? Set it up on Tattwix",
      home: { to: "/register-hotel" },
      homeLabel: pending ? "Request" : "Register",
      pending,
    });
  }
  return places;
}

/**
 * Every signed-in user gets the switcher, guests included: it is where a
 * guest becomes a host. Only a missing /me (signed out) has none.
 */
export function hasPlaceSwitcher(places: Place[]) {
  return places.length > 0;
}

/**
 * The place the URL is in, or null where no single place applies (the
 * hotel index, legacy hotel paths, or a hotel the user cannot open).
 */
export function getCurrentPlace(places: Place[], user: MeResponse | null, pathname: string): Place | null {
  const workspace = getActiveWorkspace(pathname);
  if (workspace === "platform") return places.find((place) => place.kind === "platform") ?? null;
  if (workspace === "personal") return places.find((place) => place.kind === "personal") ?? null;
  const context = getActiveHotelContext(user, pathname);
  if (!context) return null;
  const key = context.property ? `property:${context.property.id}` : `organization:${context.membership.organization.id}`;
  return places.find((place) => place.key === key) ?? null;
}

/** Search over the place name, its organization and the role. Every word must match. */
export function matchesPlaceQuery(place: Place, query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [place.label, place.detail, isHotelPlace(place) ? place.organization.name : ""]
    .join(" ")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/**
 * Recently opened places, newest first: unknown or no-longer-accessible
 * keys are dropped (access can be revoked between visits), as are
 * duplicates and Personal/Platform, which always sit at the top anyway.
 */
export function filterRecentPlaces(keys: readonly unknown[], places: Place[]): HotelPlace[] {
  const out: HotelPlace[] = [];
  for (const key of keys) {
    const place = places.find((item) => item.key === key);
    if (!place || !isHotelPlace(place) || out.includes(place)) continue;
    out.push(place);
    if (out.length === MAX_RECENT_PLACES + 1) break;
  }
  return out;
}

/** Moves `key` to the front of the recent list. */
export function pushRecentPlace(keys: readonly string[], key: string, limit = MAX_RECENT_PLACES + 1) {
  return [key, ...keys.filter((item) => item !== key)].slice(0, limit);
}

export type SwitcherSection = { key: string; title: string | null; places: Place[] };

/**
 * The switcher list: Personal and Platform first, then Recent (long lists
 * only, never while searching, never the current place), then hotels
 * grouped by organization in membership order, then "List your hotel"
 * for accounts with nowhere else to go.
 */
export function buildSwitcherSections(
  places: Place[],
  options: { query?: string; recentKeys?: readonly unknown[]; currentKey?: string | null } = {},
): SwitcherSection[] {
  const query = options.query ?? "";
  const searching = query.trim().length > 0;
  const hotels = places.filter(isHotelPlace);
  const sections: SwitcherSection[] = [];

  const you = places.filter(
    (place) => (place.kind === "personal" || place.kind === "platform") && matchesPlaceQuery(place, query),
  );
  if (you.length) sections.push({ key: "you", title: null, places: you });

  if (!searching && hotels.length >= SWITCHER_SEARCH_THRESHOLD) {
    const recent = filterRecentPlaces(options.recentKeys ?? [], places)
      .filter((place) => place.key !== options.currentKey)
      .slice(0, MAX_RECENT_PLACES);
    if (recent.length) sections.push({ key: "recent", title: "Recent", places: recent });
  }

  const groups = new Map<number, { organization: Organization; places: Place[] }>();
  for (const place of hotels) {
    if (!matchesPlaceQuery(place, query)) continue;
    const group = groups.get(place.organization.id) ?? { organization: place.organization, places: [] };
    group.places.push(place);
    groups.set(place.organization.id, group);
  }
  for (const group of groups.values()) {
    sections.push({ key: `org:${group.organization.id}`, title: group.organization.name, places: group.places });
  }

  const register = places.filter((place) => place.kind === "register" && matchesPlaceQuery(place, query));
  if (register.length) sections.push({ key: "register", title: null, places: register });
  return sections;
}

export function needsPlaceSearch(places: Place[]) {
  return places.filter(isHotelPlace).length >= SWITCHER_SEARCH_THRESHOLD;
}

/**
 * On phones the current place takes the first tab, so a workspace keeps at
 * most `keep` section tabs; the rest move behind Menu (which lights up when
 * one of them is open).
 */
export function makeRoomForPlaceTab<Item extends { isActive: boolean }>(
  split: { tabs: Item[]; overflow: Item[] },
  keep = 3,
) {
  const tabs = split.tabs.slice(0, keep);
  const overflow = [...split.tabs.slice(keep), ...split.overflow];
  return { tabs, overflow, menuActive: overflow.some((item) => item.isActive) };
}

/* Recent places in localStorage: per user, ids only, never trusted. */

const recentStorageKey = (userId: number) => `tattwix:recent-places:${userId}`;

export function readRecentPlaceKeys(userId: number): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(recentStorageKey(userId)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function writeRecentPlaceKeys(userId: number, keys: readonly string[]) {
  try {
    window.localStorage.setItem(recentStorageKey(userId), JSON.stringify(keys));
  } catch {
    // Private mode or blocked storage: Recent simply stays empty.
  }
}
