// Shared state for every workspace-switch variant. The prototype keeps a fake
// pathname and runs the production nav model on it (lib/workspace-navigation),
// so what each variant shows for a given account is exactly what the real
// shell would compute.
import type { MeResponse } from "@tattvix/contracts";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  getActiveHotelContext,
  getActiveWorkspace,
  getHotelNavItems,
  getHotelSwitchOptions,
  getPersonalNavItems,
  getPlatformNavItems,
  getWorkspaceOptions,
  splitHotelNavForTabBar,
  splitPersonalNavForTabBar,
  splitPlatformNavForTabBar,
} from "@/lib/workspace-navigation";

import { propertyFacts } from "./data";

export type Mode = "personal" | "hotel" | "platform";

/** One place the user can be: their personal (guest) space, one property, or platform admin. */
export type Context =
  | { key: "personal"; mode: "personal"; label: string; detail: string; home: string }
  | { key: "platform"; mode: "platform"; label: string; detail: string; home: string }
  | {
      key: string;
      mode: "hotel";
      label: string;
      detail: string;
      home: string;
      organization: { name: string; slug: string };
      property: { name: string; slug: string };
      city: string;
      photo: string | null;
      role: string;
    };
export type HotelContext = Extract<Context, { mode: "hotel" }>;

export type NavEntry = { key: string; label: string; shortLabel: string; path: string; isActive: boolean };

const formatRole = (role: string) => role.charAt(0) + role.slice(1).toLowerCase();

/**
 * Every context the user may open, in switcher order. Gating comes from the
 * production helpers: Hotel needs hotel:view (getHotelSwitchOptions),
 * Platform needs platform:admin (getWorkspaceOptions).
 */
export function listContexts(user: MeResponse): Context[] {
  const workspaces = getWorkspaceOptions(user, "/stays");
  const contexts: Context[] = [
    { key: "personal", mode: "personal", label: "Personal", detail: "My stays, my ID, check in somewhere", home: "/stays" },
  ];
  for (const option of getHotelSwitchOptions(user, null)) {
    if (option.to !== "/hotel/$organizationSlug/$propertySlug/dashboard") continue;
    const membership = user.memberships.find((item) => item.organization.slug === option.params.organizationSlug)!;
    const property = membership.properties.find((item) => item.slug === option.params.propertySlug)!;
    const facts = propertyFacts[`${membership.organization.slug}/${property.slug}`];
    contexts.push({
      key: `${membership.organization.slug}/${property.slug}`,
      mode: "hotel",
      label: property.name,
      detail: [facts?.city, membership.organization.name !== property.name ? membership.organization.name : null]
        .filter(Boolean)
        .join(" · "),
      home: `/hotel/${membership.organization.slug}/${property.slug}/dashboard`,
      organization: membership.organization,
      property,
      city: facts?.city ?? "",
      photo: facts?.photo ?? null,
      role: formatRole(membership.role),
    });
  }
  if (workspaces.some((option) => option.key === "platform")) {
    contexts.push({ key: "platform", mode: "platform", label: "Platform admin", detail: "Every hotel on Tattwix", home: "/admin" });
  }
  return contexts;
}

export function contextForPath(contexts: Context[], pathname: string): Context {
  const workspace = getActiveWorkspace(pathname);
  if (workspace === "platform") return contexts.find((item) => item.key === "platform") ?? contexts[0]!;
  if (workspace === "hotel") {
    const [, org, prop] = pathname.split("/").filter(Boolean);
    return contexts.find((item) => item.key === `${org}/${prop}`) ?? contexts[0]!;
  }
  return contexts[0]!;
}

/** Hotel contexts grouped by organization, in membership order. */
export function groupHotels(contexts: Context[]) {
  const groups: { organization: { name: string; slug: string }; hotels: HotelContext[] }[] = [];
  for (const context of contexts) {
    if (context.mode !== "hotel") continue;
    let group = groups.find((item) => item.organization.slug === context.organization.slug);
    if (!group) groups.push((group = { organization: context.organization, hotels: [] }));
    group.hotels.push(context);
  }
  return groups;
}

export function matchesQuery(context: Context, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [context.label, context.detail, context.mode === "hotel" ? context.organization.name : ""].join(" ").toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

function navFor(user: MeResponse, pathname: string) {
  const workspace = getActiveWorkspace(pathname);
  if (workspace === "hotel") {
    const context = getActiveHotelContext(user, pathname);
    const items = context ? getHotelNavItems(context, pathname) : [];
    const [, org, prop] = pathname.split("/").filter(Boolean);
    const resolve = (to: string) => to.replace("$organizationSlug", org!).replace("$propertySlug", prop!);
    const toEntry = (item: (typeof items)[number]): NavEntry => ({ key: item.key, label: item.label, shortLabel: item.shortLabel, path: resolve(item.to), isActive: item.isActive });
    const split = splitHotelNavForTabBar(items);
    return { items: items.map(toEntry), tabs: split.tabs.map(toEntry), overflow: split.overflow.map(toEntry), menuActive: split.menuActive };
  }
  if (workspace === "platform") {
    const items = getPlatformNavItems(pathname);
    const toEntry = (item: (typeof items)[number]): NavEntry => ({ key: item.key, label: item.label, shortLabel: item.shortLabel, path: item.to, isActive: item.isActive });
    const split = splitPlatformNavForTabBar(items);
    return { items: items.map(toEntry), tabs: split.tabs.map(toEntry), overflow: split.overflow.map(toEntry), menuActive: split.menuActive };
  }
  const items = getPersonalNavItems(pathname);
  const toEntry = (item: (typeof items)[number]): NavEntry => ({ key: item.key, label: item.label, shortLabel: item.shortLabel, path: item.to, isActive: item.isActive });
  const split = splitPersonalNavForTabBar(items);
  return { items: items.map(toEntry), tabs: split.tabs.map(toEntry), overflow: split.overflow.map(toEntry), menuActive: split.menuActive };
}

export function useWorkspaceSwitch(user: MeResponse) {
  const contexts = useMemo(() => listContexts(user), [user]);
  const hotels = contexts.filter((item): item is HotelContext => item.mode === "hotel");
  // Hotel staff open on their first property; guests on My stays.
  const [pathname, setPathname] = useState(() => (hotels[0] ?? contexts[0]!).home);
  const [recents, setRecents] = useState<string[]>([]);
  const [swapKey, setSwapKey] = useState(0);
  const [cue, setCue] = useState<{ id: number; label: string } | null>(null);

  const current = contextForPath(contexts, pathname);
  const nav = navFor(user, pathname);

  const switchTo = useCallback(
    (key: string) => {
      const next = contexts.find((item) => item.key === key);
      if (!next) return;
      setRecents((list) => [current.key, ...list.filter((item) => item !== current.key && item !== key)].slice(0, 3));
      if (next.key === current.key) {
        setPathname(next.home);
        return;
      }
      setPathname(next.home);
      setSwapKey((value) => value + 1);
      setCue({ id: Date.now(), label: next.mode === "hotel" ? `${next.label} · Today` : next.mode === "platform" ? "Platform admin · Hotels" : "Personal · My stays" });
      window.scrollTo({ top: 0 });
    },
    [contexts, current.key],
  );

  /** The hotel to open when switching into hosting: the last one used, else the first. */
  const lastHotel = (recents.map((key) => hotels.find((item) => item.key === key)).find(Boolean) ??
    (current.mode === "hotel" ? current : hotels[0])) as HotelContext | undefined;

  const navigate = useCallback((path: string) => {
    setPathname(path);
    window.scrollTo({ top: 0 });
  }, []);

  return {
    user,
    name: `${user.firstName} ${user.lastName}`.trim(),
    contexts,
    hotels,
    canPlatform: contexts.some((item) => item.mode === "platform"),
    current,
    pathname,
    nav,
    recents: recents
      .map((key) => contexts.find((item) => item.key === key))
      .filter((item): item is Context => Boolean(item) && item!.key !== current.key),
    lastHotel,
    swapKey,
    cue,
    switchTo,
    navigate,
    notBuilt: (label: string) => toast(`${label} isn't part of this prototype`),
  };
}

export type SwitchModel = ReturnType<typeof useWorkspaceSwitch>;
