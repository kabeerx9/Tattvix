import { env } from "@tattvix/env/web";
import { ClerkProvider } from "@clerk/react";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import Loader from "./components/loader";
import { RouterAuthProvider } from "./components/router-auth-provider";
import { ThemeProvider } from "./components/theme-provider";
import { AppProviders } from "./core/providers/app-providers";
import { queryClient } from "./core/query/query-client";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultPendingComponent: () => <Loader />,
  context: {
    auth: undefined!,
    queryClient,
  },
});

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
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="vite-ui-theme"
    >
      <ClerkProvider
        publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}
        signInUrl="/login"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/guest"
        signUpFallbackRedirectUrl="/guest"
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
