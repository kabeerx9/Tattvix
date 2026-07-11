import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/guest")({
  component: GuestHomePage,
});

function GuestHomePage() {
  const { currentUser } = Route.useRouteContext().auth;
  const displayName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
    currentUser?.username ||
    currentUser?.email ||
    "Guest";

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Guest portal
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Welcome, {displayName}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Every signed-in Tattvix account can access this portal. Guest profiles,
          companions, identity documents, and sharing history will live here.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <PortalCard title="Profile" description="Prepare identity details for check-in." />
        <PortalCard title="Companions" description="Manage accompanying guest profiles." />
        <PortalCard title="Sharing history" description="Review consent and hotel access." />
      </div>
    </div>
  );
}

function PortalCard({ title, description }: { title: string; description: string }) {
  return (
    <section className="border bg-card p-5">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </section>
  );
}
