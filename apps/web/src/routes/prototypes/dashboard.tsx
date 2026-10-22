import { createFileRoute } from "@tanstack/react-router";

import { DashboardPrototypes } from "@/prototypes/dashboard/harness";

// Public, throwaway design exploration for the hotel dashboard. Mock data only;
// nothing in the product imports from src/prototypes.
export const Route = createFileRoute("/prototypes/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard prototypes · Tattwix" }] }),
  component: DashboardPrototypes,
});
