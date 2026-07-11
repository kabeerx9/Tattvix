import { useAuth } from "@clerk/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, BedDouble, CalendarCheck, ClipboardList, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const operations = [
  {
    icon: CalendarCheck,
    title: "Reservations",
    description: "Keep arrivals, departures, and stay details visible for the front desk.",
  },
  {
    icon: BedDouble,
    title: "Rooms",
    description: "Track room status, availability, and operational readiness from one place.",
  },
  {
    icon: Users,
    title: "Guests",
    description: "Build guest profiles around stays, preferences, and service history.",
  },
  {
    icon: ClipboardList,
    title: "Workflows",
    description: "Create a clean base for housekeeping, notes, and property operations.",
  },
];

function HomePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const primaryCta = isLoaded && isSignedIn ? "/guest" : "/login";

  return (
    <div className="min-h-svh bg-background">
      <nav className="absolute inset-x-0 top-0 z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-white">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Tattvix
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/login" className="text-white/80 hover:text-white">
            Login
          </Link>
          <Link
            to={primaryCta}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/30 bg-white px-4 text-xs font-medium text-black shadow-lg hover:bg-white/90"
          >
            {isLoaded && isSignedIn ? "Open account" : "Get started"}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </nav>

      <section className="relative grid min-h-[92svh] place-items-center overflow-hidden rounded-b-[2.5rem]">
        <img
          alt="Modern hotel reception lobby"
          className="absolute inset-0 size-full object-cover"
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2400&q=80"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.16_0.03_275/0.88),oklch(0.2_0.04_275/0.3))]" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-20 text-white">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-white/65">
              Hotel operations workspace
            </p>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-7xl">
              Hospitality flows better here.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/78">
              A focused dashboard for managing reservations, rooms, guests, and the
              operational work that keeps a property moving.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={primaryCta}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-black shadow-xl hover:bg-white/90"
              >
                {isLoaded && isSignedIn ? "Open account" : "Login to Tattvix"}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/sign-up"
                className="inline-flex h-11 items-center rounded-xl border border-white/30 px-5 text-sm font-medium text-white hover:bg-white/10"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {operations.map((item) => (
          <div key={item.title} className="app-surface p-5">
            <span className="mb-5 grid size-10 place-items-center rounded-xl bg-accent text-primary"><item.icon className="size-5" /></span>
            <h2 className="text-sm font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
