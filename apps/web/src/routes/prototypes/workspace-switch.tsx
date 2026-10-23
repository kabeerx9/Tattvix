import { createFileRoute } from "@tanstack/react-router";

import { WorkspaceSwitchPrototypes } from "@/prototypes/workspace-switch/harness";

// Throwaway prototype route (public, mock data only). Nothing in production imports it.
export const Route = createFileRoute("/prototypes/workspace-switch")({
  head: () => ({ meta: [{ title: "Workspace switch prototypes · Tattwix" }] }),
  component: WorkspaceSwitchPrototypes,
});
