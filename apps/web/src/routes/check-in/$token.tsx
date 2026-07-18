import { Button } from "@tattvix/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Hotel, QrCode } from "lucide-react";

import { ModeToggle } from "@/components/mode-toggle";
import { Surface } from "@/components/design-system";
import { companionQueries } from "@/features/companions/queries";
import { CheckInPage } from "@/features/check-in/components/check-in-page";
import { checkInQueries } from "@/features/check-in/queries";
import { guestProfileQueries } from "@/features/guest-profile/queries";
import { identityDocumentQueries } from "@/features/identity-documents/queries";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/check-in/$token")({
  loader: async ({ context, params }) => {
    const requests: Promise<unknown>[] = [
      context.queryClient.ensureQueryData(checkInQueries.context(params.token)),
    ];

    if (context.auth.isAuthenticated) {
      requests.push(
        context.queryClient.ensureQueryData(guestProfileQueries.detail()),
        context.queryClient.ensureQueryData(identityDocumentQueries.list()),
        context.queryClient.ensureQueryData(companionQueries.list()),
      );
    }

    try {
      await Promise.all(requests);
      return { isValid: true };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return { isValid: false };
      }
      throw error;
    }
  },
  errorComponent: CheckInRouteError,
  component: CheckInRoute,
});

function CheckInRoute() {
  const { isValid } = Route.useLoaderData();
  const { token } = Route.useParams();
  return isValid ? (
    <CheckInPage token={token} />
  ) : (
    <CheckInUnavailablePage
      eyebrow="Check-in unavailable"
      title="This QR code is no longer active"
      description="Ask the front desk for the property’s current Tattvix check-in QR and scan it again."
    />
  );
}

function CheckInRouteError() {
  return (
    <CheckInUnavailablePage
      eyebrow="Could not load check-in"
      title="This check-in is temporarily unavailable"
      description="Check your connection or ask the front desk to try the property QR again."
    />
  );
}

function CheckInUnavailablePage({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-20 max-w-3xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Hotel className="size-5" />
            </span>
            <p className="text-sm font-semibold">Tattvix</p>
          </div>
          <ModeToggle />
        </div>
      </header>
      <main className="mx-auto grid max-w-3xl place-items-center px-5 py-16">
        <Surface className="grid w-full place-items-center gap-4 p-8 text-center sm:p-12">
          <span className="grid size-12 place-items-center rounded-xl bg-muted">
            <QrCode className="size-6" />
          </span>
          <div className="max-w-md">
            <p className="app-kicker">{eyebrow}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <Button nativeButton={false} variant="outline" render={<Link to="/" />}>
            Return to Tattvix
          </Button>
        </Surface>
      </main>
    </div>
  );
}
