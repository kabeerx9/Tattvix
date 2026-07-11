import { SignIn, useAuth } from "@clerk/react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    redirect: z
      .string()
      .refine((value) => value.startsWith("/") && !value.startsWith("//"))
      .optional()
      .catch(undefined),
  }),
  component: LoginPage,
});

function LoginPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const search = Route.useSearch();

  if (!isLoaded) {
    return <div className="flex min-h-svh items-center justify-center">Loading...</div>;
  }

  if (isSignedIn) {
    return <Navigate to="/guest" />;
  }

  return (
    <div className="grid min-h-svh place-items-center bg-muted/30 p-6">
      <div className="grid gap-6">
        <div className="text-center">
          <p className="text-sm font-semibold">Tattvix</p>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your workspace.</p>
        </div>
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/sign-up"
          fallbackRedirectUrl={search.redirect ?? "/guest"}
        />
      </div>
    </div>
  );
}
