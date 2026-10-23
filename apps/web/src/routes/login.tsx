import { SignIn, useAuth } from "@clerk/react";
import { Navigate, Outlet, createFileRoute, useMatch } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { BrandLogo } from "@/components/brand";
import { travelImages } from "@/lib/travel-images";
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

export function LoginPage() {
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

  // RouterAuthProvider already waits for Clerk, so this is only a guard.
  if (!isLoaded) {
    return null;
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
      <div className="relative hidden overflow-hidden bg-muted p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <img src={travelImages.hotelOwner} alt="" decoding="async" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
        <BrandLogo tone="inverse" className="relative" />
        <div className="relative max-w-lg"><h1 className="mt-4 text-5xl font-semibold leading-[1.08] tracking-[-0.045em]">Every stay starts with a calmer front desk.</h1><p className="mt-5 max-w-md text-sm leading-7 text-white/80">One thoughtful workspace for your team, your properties, and every guest arriving today.</p></div>
        <p className="relative text-xs text-white/70">Secure access powered by Clerk</p>
      </div>
      {/* 16px phone gutter: Clerk's card is 100vw - 2.5rem wide, so p-6 caused an 8px horizontal scroll. */}
      <div className="grid place-items-center px-4 py-6 sm:p-10">
      <div className="grid w-full max-w-md gap-7">
        <div className="text-center">
          <BrandLogo size="lg" className="lg:hidden" />
          <h2 className="mt-6 text-3xl font-semibold tracking-tight lg:mt-2">Sign in to Tattwix</h2>
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
