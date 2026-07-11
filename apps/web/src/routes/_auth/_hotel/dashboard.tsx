import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_hotel/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { currentUser: me } = Route.useRouteContext().auth;

  const displayName =
    [me?.firstName, me?.lastName].filter(Boolean).join(" ") ||
    me?.username ||
    me?.email ||
    "there";

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Overview</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Your authenticated dashboard shell is wired to Clerk and Django. Product
          workflows can now be added behind this layout.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="border bg-card p-6">
          <h2 className="text-sm font-medium">Workspace status</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatusTile label="Reservations" value="Empty" />
            <StatusTile label="Rooms" value="Empty" />
            <StatusTile label="Guests" value="Empty" />
          </div>
        </section>

        <section className="border bg-card p-6">
          <p className="text-sm text-muted-foreground">Signed-in account</p>
          {me ? (
            <div className="mt-4 grid gap-3 text-sm">
              <AccountDetail label="Name" value={displayName} />
              <AccountDetail label="Email" value={me.email} />
              <AccountDetail label="Username" value={me.username} />
              <AccountDetail label="Clerk ID" value={me.clerkId} />
              <AccountDetail label="Local ID" value={String(me.id)} />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function AccountDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_1fr] sm:items-baseline">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words font-medium">{value || "Not set"}</span>
    </div>
  );
}
