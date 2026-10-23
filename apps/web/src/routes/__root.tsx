import { Toaster } from "@tattvix/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import type { RouterAuthContext } from "@/lib/router-auth";

import "../index.css";

export interface RouterAppContext {
  auth: RouterAuthContext;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "Tattwix",
      },
      {
        name: "description",
        content:
          "Tattwix lets hotel guests share identity documents securely for check-in by scanning the property's QR code.",
      },
    ],
    links: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
      {
        rel: "apple-touch-icon",
        href: "/apple-touch-icon.png",
      },
    ],
  }),
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <div className="min-h-dvh">
        <Outlet />
      </div>
      <Toaster richColors />
      <TanStackRouterDevtools position="bottom-left" />
    </>
  );
}
