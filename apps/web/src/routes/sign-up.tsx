import { SignUp, useAuth } from "@clerk/react";
import { createFileRoute, Navigate, Outlet, useMatch } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { BrandLogo } from "@/components/brand";
import { hotelRegistrationSearchFromRedirect, stashPostLoginRedirect } from "@/utils/post-login-redirect";

export const Route = createFileRoute("/sign-up")({
  validateSearch: z.object({
    redirect: z
      .string()
      .refine((value) => value.startsWith("/") && !value.startsWith("//"))
      .optional()
      .catch(undefined),
  }),
  component: SignUpPage,
});

export function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const search = Route.useSearch();
  // The SSO callback is a layout child of this route; render it standalone
  // instead of the form (which has no Outlet and would swallow it).
  const signUpSsoCallbackMatch = useMatch({
    from: "/sign-up/sso-callback",
    shouldThrow: false,
  });

  // `?redirect=` does not survive the Google round trip; stash it for the
  // SSO callback route. Cleared whenever sign-up opens without one.
  useEffect(() => {
    stashPostLoginRedirect(search.redirect);
  }, [search.redirect]);

  if (signUpSsoCallbackMatch) {
    return <Outlet />;
  }

  // RouterAuthProvider already waits for Clerk, so this is only a guard.
  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    const registration = hotelRegistrationSearchFromRedirect(search.redirect);
    if (registration) return <Navigate to="/register-hotel" search={registration} />;
    const checkInToken = checkInTokenFromRedirect(search.redirect);
    if (checkInToken) {
      return (
        <Navigate
          to="/check-in/$token"
          params={{ token: checkInToken }}
        />
      );
    }
    return <Navigate to="/guest" />;
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 py-6 sm:p-6">
      <div className="text-center"><BrandLogo size="lg" /><h1 className="mt-6 text-3xl font-semibold tracking-tight">Create your Tattwix account</h1><p className="mt-2 text-sm text-muted-foreground">Your guest identity and hotel access begin here.</p></div>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl={search.redirect ? `/login?${new URLSearchParams({ redirect: search.redirect })}` : "/login"}
        fallbackRedirectUrl={search.redirect ?? "/guest"}
      />
    </div>
  );
}

function checkInTokenFromRedirect(redirect: string | undefined) {
  const match = redirect?.match(/^\/check-in\/([^/?#]+)$/);
  return match?.[1] ?? null;
}
