import { Link, createFileRoute } from "@tanstack/react-router";
import { FileCheck2, HeartHandshake, ShieldCheck } from "lucide-react";
import { PageHeader, Surface } from "@/components/design-system";

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
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <PageHeader eyebrow="Guest account" title={`Welcome, ${displayName}`} description="Keep your travel identity, companions, and hotel sharing preferences ready for a smoother arrival." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/profile" className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <PortalCard icon={FileCheck2} title="Travel profile" description="Prepare identity details for a faster check-in." />
        </Link>
        <PortalCard icon={HeartHandshake} title="Companions" description="Keep accompanying guest profiles together." />
        <PortalCard icon={ShieldCheck} title="Privacy center" description="Review consent and hotel access history." />
      </div>
      <Surface className="p-7 sm:p-9"><p className="app-kicker">Ready when you are</p><h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight">One profile, less paperwork at every Tattvix property.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Your information stays under your control and is shared only when you approve it.</p></Surface>
    </div>
  );
}

function PortalCard({ icon: Icon, title, description }: { icon: typeof FileCheck2; title: string; description: string }) {
  return (
    <Surface className="p-5"><span className="grid size-11 place-items-center rounded-xl bg-accent text-primary"><Icon className="size-5" /></span><h2 className="mt-5 text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </Surface>
  );
}
