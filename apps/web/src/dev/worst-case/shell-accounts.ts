/**
 * Dev-only account shapes for checking the app shell's place switcher in
 * the worst-case harness: `?account=guest|one|two-orgs|many|admin` swaps
 * the signed-in user's memberships and platform role. Hotel pages behind
 * them have no fixtures (they show their error state); the shell, the
 * switcher and the property covers do.
 */
import type { MeResponse, Permission } from "@tattvix/contracts";

export type ShellAccount = "guest" | "one" | "two-orgs" | "many" | "admin";
export const shellAccounts: ShellAccount[] = ["guest", "one", "two-orgs", "many", "admin"];

const owner: Permission[] = [
  "hotel:view",
  "hotel:manage",
  "members:view",
  "members:manage",
  "stays:view",
  "stays:update",
  "rooms:view",
  "rooms:manage",
  "rooms:assign",
  "reports:view",
];
const reception: Permission[] = ["hotel:view", "stays:view", "stays:update", "rooms:view", "rooms:assign"];

let nextId = 500;
function membership(
  name: string,
  slug: string,
  role: "OWNER" | "MANAGER" | "RECEPTION",
  properties: [string, string][],
): MeResponse["memberships"][number] {
  return {
    id: nextId++,
    role,
    hasAllProperties: role === "OWNER",
    permissions: role === "RECEPTION" ? reception : owner,
    organization: { id: nextId++, name, slug },
    properties: properties.map(([propertyName, propertySlug]) => ({ id: nextId++, name: propertyName, slug: propertySlug })),
  };
}

const rajwada = (extra: [string, string][] = []) =>
  membership("Rajwada Hospitality", "rajwada", "OWNER", [
    ["Umaid Niwas Haveli", "umaid-niwas"],
    ["Lakeview Residency", "lakeview"],
    // Worst case: a long name and no cover photo.
    ["Sea Breeze Candolim Beach Resort and Spa, North Goa", "sea-breeze"],
    ...extra,
  ]);
const himalayan = () =>
  membership("Himalayan Inns", "himalayan-inns", "RECEPTION", [
    ["The Ridge, Mall Road", "the-ridge"],
    ["Ganga Ghat Inn", "ganga-ghat"],
    ["Cedar Court", "cedar-court"],
  ]);

export function shellAccount(account: ShellAccount): Pick<MeResponse, "memberships" | "platformRole" | "platformPermissions"> {
  const none = { platformRole: null, platformPermissions: [] };
  switch (account) {
    case "guest":
      return { ...none, memberships: [] };
    case "one":
      return { ...none, memberships: [membership("Umaid Niwas Haveli", "umaid-niwas-haveli", "OWNER", [["Umaid Niwas Haveli", "umaid-niwas"]])] };
    case "two-orgs":
      return { ...none, memberships: [rajwada(), himalayan()] };
    case "many":
      return {
        ...none,
        memberships: [
          rajwada([
            ["Bandra Bay Suites", "bandra-bay"],
            ["Pushkar Camp", "pushkar-camp"],
            ["Jodhpur Blue House", "blue-house"],
          ]),
          himalayan(),
          membership("Malabar Retreats", "malabar", "MANAGER", [
            ["Kumarakom Backwater Retreat", "kumarakom"],
            ["Fort Kochi Bungalow", "fort-kochi"],
          ]),
          // An organization that has not added a property yet.
          membership("Deccan Stays", "deccan", "OWNER", []),
        ],
      };
    case "admin":
      return { platformRole: "SUPER_ADMIN", platformPermissions: ["platform:admin"], memberships: [rajwada(), himalayan()] };
  }
}

/** A drawn stand-in cover per property (no network), or none for the worst-case property. */
export function sampleCoverUrl(propertySlug: string) {
  if (propertySlug === "sea-breeze") return null;
  const hue = [...propertySlug].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="hsl(${hue} 35% 72%)"/><rect y="96" width="160" height="64" fill="hsl(${hue} 30% 48%)"/><rect x="44" y="52" width="72" height="56" fill="hsl(${hue} 25% 90%)"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
