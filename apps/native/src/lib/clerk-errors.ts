// Turns whatever Clerk throws into one line the auth forms can show under the
// field, plus the error code so a form can offer the right way out (an email
// that already has an account belongs on the sign-in screen, not the sign-up).

export type ClerkFailure = { code: string | null; message: string };

/** Clerk's code when the email of a sign-up already belongs to an account. */
export const EMAIL_TAKEN = "form_identifier_exists";
/** Clerk's code when a sign-in or reset names an email no account has. */
export const ACCOUNT_NOT_FOUND = "form_identifier_not_found";

type ClerkApiError = { errors: Array<{ code?: string; message?: string; longMessage?: string }> };

function isClerkApiError(error: unknown): error is ClerkApiError {
  return typeof error === "object" && error !== null && "errors" in error && Array.isArray((error as { errors: unknown }).errors);
}

// Clerk's longMessage is the sentence meant for people ("That email address is
// taken. Please try another."); message is the short label ("is taken").
export function describeClerkError(error: unknown, fallback: string): ClerkFailure {
  if (isClerkApiError(error)) {
    const first = error.errors[0];
    const message = first?.longMessage || first?.message;
    if (message) return { code: first?.code ?? null, message };
    return { code: null, message: fallback };
  }
  if (error instanceof Error && error.message) return { code: null, message: error.message };
  return { code: null, message: fallback };
}
