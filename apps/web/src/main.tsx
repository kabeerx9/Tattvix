import "@fontsource-variable/inter";
import { env } from "@tattvix/env/web";
import { ClerkProvider } from "@clerk/react";
import { Link, RouterProvider, createRouter } from "@tanstack/react-router";
import { Button } from "@tattvix/ui/components/button";
import { SearchX } from "lucide-react";
import ReactDOM from "react-dom/client";

import { EmptyState, RouteErrorState } from "./components/design-system";
import { RoutePendingBar } from "./components/route-pending-bar";
import { RouterAuthProvider } from "./components/router-auth-provider";
import { ThemeProvider } from "./components/theme-provider";
import { AppProviders } from "./core/providers/app-providers";
import { queryClient } from "./core/query/query-client";
import { clerkAppearance, clerkLocalization } from "./lib/clerk-config";
import { reactErrorHandler, initTelemetry, trackPageView } from "./lib/telemetry";
import { routeTree } from "./routeTree.gen";

initTelemetry();

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultPendingComponent: RoutePendingBar,
  defaultErrorComponent: ({ error, reset }) => (
    <RouteErrorState error={error} reset={reset} />
  ),
  defaultNotFoundComponent: () => (
    <div className="mx-auto grid min-h-[60svh] max-w-xl place-items-center px-5">
      <EmptyState
        icon={SearchX}
        title="Page not found"
        description="The link may be wrong or the page may have moved."
        action={
          <Button nativeButton={false} variant="outline" render={<Link to="/" />}>
            Go to Tattwix
          </Button>
        }
      />
    </div>
  ),
  context: {
    auth: undefined!,
    queryClient,
  },
});

router.subscribe("onResolved", () => trackPageView(window.location.href));

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Root element not found");
}

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement, {
    onUncaughtError: reactErrorHandler(),
    onCaughtError: reactErrorHandler(),
    onRecoverableError: reactErrorHandler(),
  });
  root.render(
    <ThemeProvider
      attribute="class"
      forcedTheme="light"
      enableSystem={false}
      defaultTheme="light"
      disableTransitionOnChange
      storageKey="vite-ui-theme"
    >
      <ClerkProvider
        publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}
        signInUrl="/login"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/guest"
        signUpFallbackRedirectUrl="/guest"
        appearance={clerkAppearance}
        localization={clerkLocalization}
      >
        <AppProviders client={queryClient}>
          <RouterAuthProvider>
            {(auth) => (
              <RouterProvider router={router} context={{ auth, queryClient }} />
            )}
          </RouterAuthProvider>
        </AppProviders>
      </ClerkProvider>
    </ThemeProvider>,
  );
}
