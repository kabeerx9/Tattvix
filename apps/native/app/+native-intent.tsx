// Normalises links the OS hands the app (App Links, Universal Links) to router
// paths. Runs before the router has any app state, so it only rewrites paths;
// sign-in gating happens on the target screens.
import { resolveAppLinkPath } from "@/src/lib/app-links";

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return resolveAppLinkPath(path) ?? path;
}
