import { SignIn, useAuth } from "@clerk/react";
import { Navigate, Outlet, createFileRoute, useMatch } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import Loader from "@/components/loader";
import { stashPostLoginRedirect } from "@/utils/post-login-redirect";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    redirect: z
      .string()
      .refine((value) => value.startsWith("/") && !value.startsWith("//"))
      .optional()
      .catch(undefined),
  }),
  component: LoginPage,
});

function LoginPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const search = Route.useSearch();
  // The SSO callback is a layout child of this route; render it standalone
  // instead of the form (which has no Outlet and would swallow it).
  const ssoCallbackMatch = useMatch({
    from: "/login/sso-callback",
    shouldThrow: false,
  });

  // `?redirect=` does not survive the Google round trip; stash it for the
  // SSO callback route. Cleared whenever login opens without one.
  useEffect(() => {
    stashPostLoginRedirect(search.redirect);
  }, [search.redirect]);

  if (ssoCallbackMatch) {
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
    <div className="grid min-h-svh bg-background lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10" /><div className="absolute -bottom-32 -left-24 size-[30rem] rounded-full border-[80px] border-white/10" />
        <p className="relative text-lg font-semibold tracking-tight">Tattvix</p>
        <div className="relative max-w-lg"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">Hospitality, beautifully organized</p><h1 className="mt-4 text-5xl font-semibold leading-[1.08] tracking-[-0.045em]">Every stay starts with a calmer front desk.</h1><p className="mt-5 max-w-md text-sm leading-7 text-white/75">One thoughtful workspace for your team, your properties, and every guest arriving today.</p></div>
        <p className="relative text-xs text-white/55">Secure access powered by Clerk</p>
      </div>
      <div className="grid place-items-center p-6 sm:p-10">
      <div className="grid w-full max-w-md gap-7">
        <div className="text-center">
          <p className="app-kicker">Welcome back</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Sign in to Tattvix</h2>
          <p className="mt-2 text-sm text-muted-foreground">Continue to your hospitality workspace.</p>
        </div>
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/sign-up"
          fallbackRedirectUrl={search.redirect ?? "/guest"}
        />
      </div></div>
    </div>
  );
}

function checkInTokenFromRedirect(redirect: string | undefined) {
  const match = redirect?.match(/^\/check-in\/([^/?#]+)$/);
  return match?.[1] ?? null;
}
