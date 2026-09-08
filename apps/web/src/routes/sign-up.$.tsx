import { createFileRoute } from "@tanstack/react-router";

import { SignUpPage } from "./sign-up";

// Clerk's path-routed <SignUp> navigates to sub-paths (verify-email-address,
// continue, ...) that have no dedicated route file. Reuse the sign-up page
// so those steps render the same form; the SSO callback keeps its own route.
export const Route = createFileRoute("/sign-up/$")({
  component: SignUpPage,
});
