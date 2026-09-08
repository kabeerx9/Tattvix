import { createFileRoute } from "@tanstack/react-router";

import { LoginPage } from "./login";

// Clerk's path-routed <SignIn> navigates to sub-paths (verify-email-address,
// factor-one, ...) that have no dedicated route file. Reuse the login page
// so those steps render the same form; the SSO callback keeps its own route.
export const Route = createFileRoute("/login/$")({
  component: LoginPage,
});
