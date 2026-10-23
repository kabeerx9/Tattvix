/**
 * Dev-only worst-case harness for the guest screens.
 *
 * Served by `vite dev` at /worst-case.html (e.g.
 * http://localhost:3001/worst-case.html?data=worst#/companions). It is not a
 * Vite build input, so it never ships: production builds only bundle
 * index.html → src/main.tsx. It renders the real route tree with hash
 * history, a fixture-backed signed-in user, and a stubbed API (see
 * fetch-stub.ts), so the screens receive worst-case data through the same
 * API boundary as production.
 */
import "./fetch-stub";
import "@fontsource-variable/inter";

import { ClerkProvider } from "@clerk/react";
import { env } from "@tattvix/env/web";
import { RouterProvider, createHashHistory, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import { RouteErrorState } from "@/components/design-system";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProviders } from "@/core/providers/app-providers";
import { queryClient } from "@/core/query/query-client";
import { hideBootSplash } from "@/lib/boot-splash";
import { settleEntranceMotionAfterFirstUse } from "@/lib/entrance-motion";
import type { RouterAuthContext } from "@/lib/router-auth";
import { routeTree } from "@/routeTree.gen";

import { fixtureData } from "./fetch-stub";
import { DatasetToggle } from "./toggle";

const signedOut = new URLSearchParams(window.location.search).get("auth") === "out";
const auth: RouterAuthContext = signedOut
  ? { isAuthenticated: false, currentUser: null }
  : { isAuthenticated: true, currentUser: fixtureData.me };

const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultErrorComponent: ({ error, reset }) => (
    <RouteErrorState error={error} reset={reset} />
  ),
  context: { auth, queryClient },
});

const rootElement = document.getElementById("app");
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
  <ThemeProvider attribute="class" forcedTheme="light" defaultTheme="light">
    <ClerkProvider publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}>
      <AppProviders client={queryClient}>
        <RouterProvider router={router} context={{ auth, queryClient }} />
        <DatasetToggle />
      </AppProviders>
    </ClerkProvider>
  </ThemeProvider>,
);
hideBootSplash();
settleEntranceMotionAfterFirstUse();
