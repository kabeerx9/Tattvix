// Maps an https link to tattwix.in (Android App Links, iOS Universal Links) to
// the native route it should open. Pure: no router or app state, so the
// router-facing wrapper in app/+native-intent.tsx only rewrites paths.
const WEB_HOSTS = new Set(["tattwix.in", "www.tattwix.in"]);
const HOTEL_LANDING = "/";
// Where Clerk's Google sign-in returns (tattwix://sso-callback). The auth session
// reads it; the router must not treat it as a screen, so it lands on the root,
// which sends a signed-in person to their place.
const AUTH_CALLBACK_HOSTS = new Set(["sso-callback", "oauth-native-callback"]);

// Returns the route for an incoming URL, `null` when the router should keep its
// default handling (custom schemes such as tattwix://), or "/" for anything on
// the web that has no native screen and for the sign-in return link.
export function resolveAppLinkPath(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol === "tattwix:" && AUTH_CALLBACK_HOSTS.has(parsed.hostname)) return "/";
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!WEB_HOSTS.has(parsed.hostname)) return "/";

  const segments = parsed.pathname.split("/").filter(Boolean);
  const [root, ...rest] = segments;

  if (root === "check-in") {
    return rest.length === 1 ? `/check-in/${rest[0]}` : "/";
  }
  if (root === "getting-started") {
    return rest.length === 0 ? "/(guest)/getting-started" : "/";
  }
  if (root === "hotel") {
    return resolveHotelPath(rest);
  }
  return "/";
}

// rest = [org, prop, page?, id?, ...]. Without a property the landing picks one.
function resolveHotelPath(rest: string[]): string {
  const [org, prop, page, id, ...extra] = rest;
  if (!org || !prop) return HOTEL_LANDING;

  const base = `/(hotel)/${org}/${prop}`;
  if (page === undefined) return base;

  if (page === "stays") {
    if (id === undefined) return extra.length === 0 ? `${base}/stays` : base;
    return extra.length === 0 ? `${base}/stays/${id}` : base;
  }
  // The Guests page was folded into Stays; old links land there.
  if (page === "guests") return id === undefined ? `${base}/stays` : base;

  // Pages with no sub-route. Anything else (dashboard, reservations, ...) lands on the dashboard.
  if (id === undefined && ["rooms", "reports", "reviews", "details", "getting-started"].includes(page)) {
    return `${base}/${page}`;
  }
  return base;
}
