import { SignUp, useAuth } from "@clerk/react";
import { createFileRoute, Navigate, Outlet, useMatch } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import Loader from "@/components/loader";
import { stashPostLoginRedirect } from "@/utils/post-login-redirect";

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

  if (!isLoaded) {
    return <Loader />;
  }

  if (isSignedIn) {
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
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="text-center"><p className="app-kicker">Get started</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Create your Tattvix account</h1><p className="mt-2 text-sm text-muted-foreground">Your guest identity and hotel access begin here.</p></div>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/login"
        fallbackRedirectUrl={search.redirect ?? "/guest"}
      />
    </div>
  );
}

function checkInTokenFromRedirect(redirect: string | undefined) {
  const match = redirect?.match(/^\/check-in\/([^/?#]+)$/);
  return match?.[1] ?? null;
}
