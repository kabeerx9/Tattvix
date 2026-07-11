import { Button } from "@tattvix/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/_auth/unauthorized")({
  validateSearch: z.object({
    from: z.string().optional().catch(undefined),
  }),
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center text-center">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Access restricted
        </p>
        <h1 className="mt-2 text-2xl font-semibold">You do not have access to this area</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your account is signed in, but it does not have the required hotel or platform
          permission.
        </p>
        <Button className="mt-6" render={<Link to="/settings" />}>
          Go to account settings
        </Button>
      </div>
    </div>
  );
}
