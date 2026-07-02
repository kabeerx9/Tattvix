import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/account")({
  component: AccountRedirect,
});

function AccountRedirect() {
  return <Navigate to="/settings" />;
}
