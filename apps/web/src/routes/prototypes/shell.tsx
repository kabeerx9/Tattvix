import { createFileRoute } from "@tanstack/react-router";

import { ShellPrototypes } from "@/prototypes/shell/harness";

// Public, throwaway design exploration for the app shell, palette and
// dashboards. Mock data only; nothing in the product imports from
// src/prototypes.
export const Route = createFileRoute("/prototypes/shell")({
  head: () => ({ meta: [{ title: "Shell prototypes · Tattwix" }] }),
  component: ShellPrototypes,
});
