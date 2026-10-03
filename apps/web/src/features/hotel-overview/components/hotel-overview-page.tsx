import { Button } from "@tattvix/ui/components/button";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Gauge, BedDouble, LogIn, LogOut, Clock, IndianRupee, CircleDot, LayoutGrid, BarChart3 } from "lucide-react";

import { PageHeader, EmptyState, KpiStrip, Kpi, Panel, PanelHeader, PanelSection, StatusPill } from "@/components/design-system";
import { propertyPhotoQueries } from "@/features/property-photos/queries";
import { getRoomTypePhotoUrl } from "@/features/property-photos/helpers";
import { RoomTypeThumbnail } from "@/features/property-photos/components/room-type-thumbnail";
import { hotelOperationsQueries } from "@/features/hotel-operations/queries";
import { hotelStayQueries } from "@/features/hotel-stays/queries";
import { formatMoneyWholeRupees } from "@/lib/money";
import { getInitials } from "@/lib/initials";

import { hotelOverviewQueries } from "../queries";
import { countArrivalsToday, countDeparturesToday, getLeavingToday, getOccupancyTrend, localDayKey, getDailyMovement, getInHouse, getNeedsAction, getRoomStats } from "../metrics";
import { OccupancyTrendChart } from "./occupancy-trend-chart";
import { MovementChart } from "./movement-chart";
import { RoomStatusChart } from "./room-status-chart";

const timeFormat = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" });
const checkedInFormat = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });
const linkClassName = "text-sm text-primary underline-offset-4 hover:underline";
const tableRowClassName = "grid min-w-[820px] grid-cols-[minmax(0,2fr)_80px_minmax(0,1fr)_120px_120px_130px] items-center gap-4 px-5";

export function HotelOverviewPage({ organizationSlug, propertySlug }: { organizationSlug: string; propertySlug: string }) {
  const { data: stayData } = useSuspenseQuery(hotelStayQueries.list(organizationSlug, propertySlug));
  const { data: roomData } = useSuspenseQuery(hotelOperationsQueries.rooms(organizationSlug, propertySlug));
  const { data: summary } = useSuspenseQuery(hotelOverviewQueries.summary(organizationSlug, propertySlug));
  const { data: photos } = useQuery(propertyPhotoQueries.list(organizationSlug, propertySlug));
  const today = new Date();
  const todayKey = localDayKey(today);
  const leaving = getLeavingToday(stayData.stays, today);
  const departures = countDeparturesToday(stayData.stays, today);
  const trend = getOccupancyTrend(summary);
  const delta = trend.length > 1 ? trend.at(-1)!.percent - trend.at(-2)!.percent : 0;
  const stats = getRoomStats(roomData.rooms);
  const { waiting, toClean } = getNeedsAction(stayData.stays, roomData.rooms);
  const inHouse = getInHouse(stayData.stays);
  const movement = getDailyMovement(stayData.stays, today, 7);
  const params = { organizationSlug, propertySlug };
  const roomsById = new Map(roomData.rooms.map((room) => [room.id, room]));

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6">
      <PageHeader
        title="Today"
        meta={new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(today)}
      />
      <KpiStrip>
        <Kpi icon={Gauge} label="Occupancy" value={`${stats.occupancyPercent}%`} detail={<>
          {stats.occupied} of {stats.active} rooms{delta !== 0 ? <span className={`ml-2 inline-block rounded-full px-1.5 py-0.5 text-xs font-medium ${delta > 0 ? "bg-success-tint text-success" : "bg-destructive-tint text-destructive"}`}>{delta > 0 ? "▲" : "▼"} {Math.abs(delta)} pts</span> : null}
        </>} />
        <Kpi icon={BedDouble} label="In house" value={inHouse.length} detail="stays" />
        <Kpi icon={LogIn} label="Arrivals today" value={countArrivalsToday(stayData.stays, today)} />
        <Kpi icon={LogOut} label="Departures today" value={departures.done + departures.due} detail={`${departures.done} done · ${departures.due} due`} />
        <Kpi icon={Clock} label="Waiting for a room" value={waiting.length} />
        {summary.revenue ? <Kpi icon={IndianRupee} label="Revenue, 7 days" value={<span className="whitespace-nowrap">{formatMoneyWholeRupees(summary.revenue.totalMinor)}</span>} /> : null}
      </KpiStrip>

      <div className="grid gap-6">
        <Panel>
          <PanelHeader title="Needs action" icon={CircleDot} meta={waiting.length + leaving.length + toClean.length} />
          <div className="grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)] md:divide-x md:divide-border-soft">
            <div className="min-w-0 py-3">
              <h3 className="px-5 pb-2 text-xs text-subtle-foreground">Waiting for a room</h3>
              {waiting.length ? waiting.map((stay, index) => (
                <div key={stay.id} className="flex min-h-11 items-center gap-3 px-5 py-1">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">{getInitials(stay.guestName)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium">{stay.guestName}</p>
                    <p className="text-xs text-subtle-foreground tabular-nums">{stay.companionCount > 0 ? `+${stay.companionCount} · ` : ""}{stay.submittedAt ? timeFormat.format(new Date(stay.submittedAt)) : "—"}</p>
                  </div>
                  <Button size="sm" variant={index === 0 ? "default" : "outline"} nativeButton={false} render={<Link to="/hotel/$organizationSlug/$propertySlug/stays/$stayId" params={{ ...params, stayId: stay.id }} />}>Assign room</Button>
                </div>
              )) : <p className="px-5 py-3 text-sm text-muted-foreground">No one is waiting.</p>}
            </div>
            <div className="min-w-0 border-t border-border-soft py-3 md:border-t-0">
              <h3 className="px-5 pb-2 text-xs text-subtle-foreground">Leaving today</h3>
              {leaving.length ? leaving.map((stay) => (
                <Link key={stay.id} to="/hotel/$organizationSlug/$propertySlug/stays/$stayId" params={{ ...params, stayId: stay.id }} className="flex min-h-11 items-center gap-3 px-5 py-1 hover:bg-muted/50">
                  {/* One identifier per row: the room photo when there is one, otherwise the guest's initials. */}
                  {getRoomTypePhotoUrl(photos, stay.room ? roomsById.get(stay.room.id)?.roomType : undefined) ? (
                    <RoomTypeThumbnail url={getRoomTypePhotoUrl(photos, stay.room ? roomsById.get(stay.room.id)?.roomType : undefined)} />
                  ) : (
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">{getInitials(stay.guestName)}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{stay.guestName}</p>
                    <p className="truncate text-xs text-subtle-foreground">Room {stay.room?.number ?? "—"}{stay.room ? ` · ${roomsById.get(stay.room.id)?.roomType || "—"}` : ""}</p>
                  </div>
                  <StatusPill tone={stay.expectedCheckOutDate! < todayKey ? "danger" : "warning"}>{stay.expectedCheckOutDate! < todayKey ? "Overdue" : "Due today"}</StatusPill>
                </Link>
              )) : <p className="px-5 py-3 text-sm text-muted-foreground">No departures due.</p>}
            </div>
            <div className="min-w-0 border-t border-border-soft py-3 md:border-t-0">
              <h3 className="px-5 pb-2 text-xs text-subtle-foreground">To clean</h3>
              {toClean.length ? toClean.map((room) => (
                <div key={room.id} className="flex h-11 items-center gap-3 px-5 text-sm">
                  <span className="font-medium tabular-nums">{room.number}</span>
                  <span className="truncate text-xs text-subtle-foreground">{room.roomType}</span>
                </div>
              )) : <p className="px-5 py-3 text-sm text-muted-foreground">All rooms are ready.</p>}
              <div className="px-5 pt-3"><Link to="/hotel/$organizationSlug/$propertySlug/rooms" params={params} className={linkClassName}>Open rooms</Link></div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Panel>
          <PanelHeader title="Arrivals & departures" icon={BarChart3} meta="7 days" />
          <PanelSection><MovementChart data={movement} /></PanelSection>
        </Panel>
        <Panel>
          <PanelHeader title="Occupancy" icon={Gauge} meta="7 days" />
          <PanelSection><OccupancyTrendChart data={trend} /></PanelSection>
        </Panel>
        <Panel className="lg:col-span-2 xl:col-span-1">
          <PanelHeader title="Rooms right now" icon={LayoutGrid} actions={<Link to="/hotel/$organizationSlug/$propertySlug/rooms" params={params} className={linkClassName}>Open rooms</Link>} />
          <PanelSection>{stats.active === 0 ? <EmptyState icon={BedDouble} title="No rooms yet" description="Add rooms to start assigning guests." action={<Link to="/hotel/$organizationSlug/$propertySlug/rooms" params={params} className={linkClassName}>Open rooms</Link>} /> : <RoomStatusChart stats={stats} />}</PanelSection>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="In house" icon={BedDouble} meta={inHouse.length} actions={<Link to="/hotel/$organizationSlug/$propertySlug/stays" params={params} className={linkClassName}>View all stays</Link>} />
        {inHouse.length ? (
          <div className="overflow-x-auto" role="table" aria-label="In house">
            <div role="rowgroup">
              <div role="row" className={`${tableRowClassName} h-11 bg-muted text-xs text-subtle-foreground`}>
                {["Guest", "Room", "Type", "Checked in", "Due out", "Status"].map((label) => <span key={label} role="columnheader">{label}</span>)}
              </div>
            </div>
            <div role="rowgroup">
              {inHouse.map((stay) => (
                <Link key={stay.id} role="row" to="/hotel/$organizationSlug/$propertySlug/stays/$stayId" params={{ ...params, stayId: stay.id }} className={`${tableRowClassName} h-11 border-t border-border-soft text-sm hover:bg-muted/50`}>
                  <span role="cell" className="flex min-w-0 items-center gap-3 font-medium"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs">{getInitials(stay.guestName)}</span><span className="truncate">{stay.guestName}</span></span>
                  <span role="cell" className="tabular-nums">{stay.room?.number ?? "—"}</span>
                  <span role="cell" className="flex min-w-0 items-center gap-2 text-muted-foreground"><RoomTypeThumbnail url={getRoomTypePhotoUrl(photos, stay.room ? roomsById.get(stay.room.id)?.roomType : undefined)} /><span className="truncate">{stay.room ? roomsById.get(stay.room.id)?.roomType ?? "—" : "—"}</span></span>
                  <span role="cell" className="text-muted-foreground tabular-nums">{stay.checkedInAt ? checkedInFormat.format(new Date(stay.checkedInAt)) : "—"}</span>
                  <span role="cell" className="text-muted-foreground tabular-nums">{stay.expectedCheckOutDate === todayKey ? "Today" : stay.expectedCheckOutDate ? checkedInFormat.format(new Date(`${stay.expectedCheckOutDate}T12:00:00`)) : "—"}</span>
                  <span role="cell">{stay.expectedCheckOutDate && stay.expectedCheckOutDate <= todayKey ? <StatusPill tone="warning">Leaving today</StatusPill> : <StatusPill tone="success">Checked in</StatusPill>}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : <EmptyState icon={BedDouble} title="No guests in house" description="Checked-in guests appear here with their room and due-out date." />}
      </Panel>
    </div>
  );
}
