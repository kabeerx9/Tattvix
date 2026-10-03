import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@tattvix/ui/components/button";
import { PageHeader, Panel } from "@/components/design-system";

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
      <PageHeader
        title={`Welcome, ${displayName}`}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/stays"
          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PortalCard
            icon={ClipboardCheck}
            title="My stays"
            description="See your assigned room, bill, and checkout history."
          />
        </Link>
        <Link
          to="/profile"
          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PortalCard
            icon={FileCheck2}
            title="Travel profile"
            description="Prepare identity details for a faster check-in."
          />
        </Link>
        <Link
          to="/companions"
          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PortalCard
            icon={HeartHandshake}
            title="Companions"
            description="Keep accompanying guest profiles together."
          />
        </Link>
        <Link
          to="/privacy"
          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PortalCard
            icon={ShieldCheck}
            title="Privacy center"
            description="Review consent and hotel access history."
          />
        </Link>
      </div>
      <Panel className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <Building2 className="size-[18px]" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Own a hotel?</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              Submit your hotel for approval and track your request here.
            </p>
          </div>
        </div>
        <Button
          nativeButton={false}
          variant="outline"
          className="shrink-0"
          render={<Link to="/register-hotel" />}
        >
          Register your hotel
        </Button>
      </Panel>
      <Panel className="p-5">
        <h2 className="text-sm font-semibold">Ready when you are</h2>
        <p className="mt-2 text-xs text-subtle-foreground">One profile, less paperwork. Your information is shared only when you approve it.</p>
      </Panel>
    </div>
  );
}

function PortalCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileCheck2;
  title: string;
  description: string;
}) {
  return (
    <Panel className="relative h-full p-5 hover:bg-muted/50">
      <span className="grid size-9 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-[18px]" />
      </span>
      <ChevronRight className="absolute right-5 top-5 size-4 text-muted-foreground" /><h2 className="mt-3 text-sm font-semibold">{title}</h2>
      <p className="mt-2 text-xs leading-5 text-subtle-foreground">
        {description}
      </p>
    </Panel>
  );
}
