// Carries the guest's post-login destination (e.g. `/check-in/<token>`) across
// an OAuth round trip. The `?redirect=` search param on /login and /sign-up
// does not survive leaving for Google and coming back to the SSO callback
// route, but sessionStorage does (same tab).

const POST_LOGIN_REDIRECT_KEY = "tattvix:post-login-redirect";

export function stashPostLoginRedirect(redirect: string | undefined): void {
  if (redirect) {
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, redirect);
  } else {
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  }
}

// Read-only on purpose: React StrictMode double-invokes state initializers
// (and effects) in dev, so a read-and-clear here would wipe the value on
// the first pass and hand the second pass null. Hygiene comes from the
// auth pages, which overwrite or clear the key on every open.
export function readPostLoginRedirect(): string | null {
  return sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
}

export function checkInTokenFromRedirect(
  redirect: string | null | undefined,
): string | null {
  const match = redirect?.match(/^\/check-in\/([^/?#]+)$/);
  return match?.[1] ?? null;
}

/** Only the registration destination is accepted here; arbitrary return URLs
 * are never promoted into the sign-in callback's trusted destination. */
export function hotelRegistrationSearchFromRedirect(
  redirect: string | null | undefined,
): { ref?: string } | null {
  if (
    !redirect?.startsWith("/") ||
    redirect.startsWith("//") ||
    redirect.includes("\\")
  )
    return null;
  try {
    const url = new URL(redirect, "https://tattwix.invalid");
    if (
      url.origin !== "https://tattwix.invalid" ||
      url.pathname !== "/register-hotel"
    )
      return null;
    const ref = url.searchParams.get("ref");
    return ref && ref.length <= 32 ? { ref } : {};
  } catch {
    return null;
  }
}

export function postLoginDestination(
  redirect: string | null | undefined,
): string {
  const registration = hotelRegistrationSearchFromRedirect(redirect);
  if (registration)
    return `/register-hotel${registration.ref ? `?${new URLSearchParams({ ref: registration.ref })}` : ""}`;
  const token = checkInTokenFromRedirect(redirect);
  return token ? `/check-in/${token}` : "/guest";
}
