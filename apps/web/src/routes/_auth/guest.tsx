import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Button } from "@tattvix/ui/components/button";
import { Panel } from "@/components/design-system";
import { travelImages } from "@/lib/travel-images";

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
      {/* Hero: the photo is decorative; the scrim keeps the heading legible on any image. */}
      <section className="relative overflow-hidden rounded-lg bg-muted">
        <img
          src={travelImages.home}
          alt=""
          decoding="async"
          className="h-56 w-full object-cover sm:h-64"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-white">
            Welcome, {displayName}
          </h1>
          <p className="mt-1 text-sm text-white/85">
            Your travel identity, ready before you arrive.
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {destinations.map((destination) => (
          <Link
            key={destination.to}
            to={destination.to}
            className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PortalCard {...destination} />
          </Link>
        ))}
      </div>

      <Panel className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <img
            src={travelImages.hotelOwner}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-16 shrink-0 rounded-md object-cover"
          />
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

      <Panel className="grid overflow-hidden sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="p-6">
          <h2 className="text-sm font-semibold">Ready when you are</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            One profile, less paperwork. Your information is shared only when you approve it.
          </p>
        </div>
        <img
          src={travelImages.journey}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-40 w-full object-cover sm:h-44"
        />
      </Panel>
    </div>
  );
}

const destinations = [
  {
    to: "/stays",
    image: travelImages.stays,
    title: "My stays",
    description: "See your assigned room, bill, and checkout history.",
  },
  {
    to: "/profile",
    image: travelImages.profile,
    title: "Travel profile",
    description: "Prepare identity details for a faster check-in.",
  },
  {
    to: "/companions",
    image: travelImages.companions,
    title: "Companions",
    description: "Keep accompanying guest profiles together.",
  },
  {
    to: "/privacy",
    image: travelImages.privacy,
    title: "Privacy center",
    description: "Review consent and hotel access history.",
  },
] as const;

function PortalCard({
  image,
  title,
  description,
}: {
  image: string;
  title: string;
  description: string;
}) {
  return (
    <Panel className="group h-full overflow-hidden">
      <div className="overflow-hidden bg-muted">
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      </div>
      <div className="flex items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1.5 text-xs leading-5 text-subtle-foreground">{description}</p>
        </div>
        <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      </div>
    </Panel>
  );
}
