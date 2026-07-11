import { Button } from "@tattvix/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, BedDouble, CalendarDays, CheckCircle2, Clock3, Plus, Users } from "lucide-react";

import { PageHeader, Surface } from "@/components/design-system";

export const Route = createFileRoute("/_auth/_hotel/dashboard")({ component: DashboardPage });

const arrivals = [
  { guest: "Aarav Sharma", room: "Deluxe King · 204", time: "12:30", status: "Confirmed" },
  { guest: "Maya Kapoor", room: "Garden Suite · 118", time: "14:00", status: "Pre-checked" },
  { guest: "Noah Williams", room: "Twin Room · 306", time: "15:45", status: "Pending" },
];

function DashboardPage() {
  const me = Route.useRouteContext().auth.currentUser;
  const name = me?.firstName || me?.username || "there";

  return (
    <div className="mx-auto grid max-w-[1360px] gap-8">
      <PageHeader
        eyebrow="Sunday, 12 July"
        title={`Good morning, ${name}`}
        description="A focused view of today’s arrivals, departures, and room readiness."
        action={<Button size="lg"><Plus /> New reservation</Button>}
      />

      <Surface className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
        <Summary icon={CalendarDays} label="Arrivals" value="12" detail="4 already checked in" />
        <Summary icon={Clock3} label="Departures" value="8" detail="Next checkout at 10:30" />
        <Summary icon={BedDouble} label="Rooms ready" value="32 / 37" detail="86% of available inventory" />
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,.7fr)]">
        <Surface>
          <div className="flex items-center justify-between border-b px-6 py-5">
            <div><p className="text-base font-semibold">Upcoming arrivals</p><p className="mt-1 text-xs text-muted-foreground">The next guests expected at the property</p></div>
            <Button variant="ghost">View reservations <ArrowUpRight /></Button>
          </div>
          <div className="divide-y">
            {arrivals.map((arrival) => (
              <div key={arrival.guest} className="grid gap-3 px-6 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,.8fr)_70px_auto] sm:items-center">
                <div><p className="text-sm font-semibold">{arrival.guest}</p><p className="mt-1 text-xs text-muted-foreground">{arrival.room}</p></div>
                <p className="text-sm text-muted-foreground">Today at {arrival.time}</p>
                <span className="text-xs font-medium">2 nights</span>
                <span className="w-fit rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">{arrival.status}</span>
              </div>
            ))}
          </div>
        </Surface>

        <div className="grid gap-6">
          <Surface className="p-6">
            <div className="flex items-start justify-between"><div><p className="text-sm font-semibold">Occupancy</p><p className="mt-1 text-xs text-muted-foreground">Current property utilization</p></div><span className="text-3xl font-semibold tracking-[-0.04em]">78%</span></div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-[78%] rounded-full bg-primary" /></div>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-5"><SmallStat label="Occupied" value="29 rooms" /><SmallStat label="Available" value="8 rooms" /></div>
          </Surface>

          <Surface className="p-6">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground"><CheckCircle2 className="size-5" /></span><div><p className="text-sm font-semibold">Front desk checklist</p><p className="text-xs text-muted-foreground">3 items need attention</p></div></div>
            <div className="mt-5 divide-y">
              <Task title="Prepare two early-arrival rooms" meta="Before 11:30" />
              <Task title="Confirm airport transfer" meta="Maya Kapoor" />
              <Task title="Review room 204 maintenance" meta="Open since yesterday" />
            </div>
          </Surface>
        </div>
      </div>

      <Surface className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4"><span className="grid size-11 place-items-center rounded-xl bg-muted"><Users className="size-5" /></span><div><p className="text-sm font-semibold">46 guests are currently in-house</p><p className="mt-1 text-xs text-muted-foreground">Across 29 occupied rooms, with 6 special requests active.</p></div></div>
        <Button variant="outline">Open guest directory</Button>
      </Surface>
    </div>
  );
}

function Summary({ icon: Icon, label, value, detail }: { icon: typeof CalendarDays; label: string; value: string; detail: string }) {
  return <div className="flex items-center gap-4 px-6 py-5"><span className="grid size-10 place-items-center rounded-xl bg-muted text-foreground"><Icon className="size-5" /></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-[-0.03em]">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div></div>;
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}

function Task({ title, meta }: { title: string; meta: string }) {
  return <div className="flex gap-3 py-3 first:pt-0 last:pb-0"><span className="mt-1 size-2 shrink-0 rounded-full bg-primary" /><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{meta}</p></div></div>;
}
