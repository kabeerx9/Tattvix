import { env } from "@tattvix/env/web";
import { ClerkProvider } from "@clerk/react";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import Loader from "./components/loader";
import { RouterAuthProvider } from "./components/router-auth-provider";
import { AppProviders } from "./core/providers/app-providers";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultPendingComponent: () => <Loader />,
  context: {
    auth: undefined!,
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
    <ClerkProvider
      publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}
      signInUrl="/login"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/guest"
      signUpFallbackRedirectUrl="/guest"
    >
      <AppProviders>
        <RouterAuthProvider>
          {(auth) => <RouterProvider router={router} context={{ auth }} />}
        </RouterAuthProvider>
      </AppProviders>
    </ClerkProvider>,
  );
}
