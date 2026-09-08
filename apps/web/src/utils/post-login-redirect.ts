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
