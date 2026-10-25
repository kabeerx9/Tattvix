// The hotel the person opened last, so the next launch lands there. Stored per
// Clerk user as a `property:<id>` key, never names. Read synchronously so the
// landing redirect needs no loading state. expo-secure-store is already linked;
// the value is not secret, but it is small and the sync API is what we need.
import * as SecureStore from "expo-secure-store";

const keyFor = (clerkUserId: string) => `tattwix.last-place.${clerkUserId.replace(/[^A-Za-z0-9._-]/g, "_")}`;

export function readLastPlace(clerkUserId: string): string | null {
  try {
    return SecureStore.getItem(keyFor(clerkUserId));
  } catch {
    return null;
  }
}

export function writeLastPlace(clerkUserId: string, placeKey: string) {
  try {
    SecureStore.setItem(keyFor(clerkUserId), placeKey);
  } catch {
    // Storage unavailable: the next launch simply lands on the first hotel.
  }
}
