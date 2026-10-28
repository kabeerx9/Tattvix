// Rooms as a floor board, like the board behind a reception desk: every room
// as a small tile, floor by floor. Occupied rooms wear the stay key card's
// colour, with the guest's first name, and link to the stay; a dot marks who
// leaves today (amber) or is late (red). Mirrors apps/native/src/components/floor-board.tsx;
// grouping comes from getFloorBoard in @tattvix/api.
import type { FloorBoardFloor, FloorBoardTile, RoomStats } from "@tattvix/api";
import { cn } from "@tattvix/ui/lib/utils";
import { Link } from "@tanstack/react-router";

// Same values as native's keyCard tokens.
const plum = "#6b0f35";
const keyGradient = "radial-gradient(120% 140% at 100% 0%, #8c1340 0%, #4a0d29 45%, #250716 100%)";
const leavingDot = "#fbbf24";
const lateDot = "#dc2626";

const legend = [
  { key: "occupied", label: "occupied", color: plum },
  { key: "vacant", label: "ready", color: "#12924f" },
  { key: "cleaning", label: "cleaning", color: "#d97706" },
  { key: "maintenance", label: "maintenance", color: "#bdbdbd" },
] as const;

/** The coloured bar and counts over the board. */
export function RoomStatusStrip({ stats, floors }: { stats: RoomStats; floors: FloorBoardFloor[] }) {
  const shown = legend.filter((item) => stats[item.key] > 0);
  const tiles = floors.flatMap((floor) => floor.tiles);
  const leaving = tiles.filter((tile) => tile.leavingToday).length;
  const late = tiles.filter((tile) => tile.overdue).length;
  return (
    <div className="grid gap-2">
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {shown.map((item) => <span key={item.key} style={{ flex: stats[item.key], backgroundColor: item.color }} />)}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {shown.map((item) => <LegendItem key={item.key} color={item.color}><b className="font-bold">{stats[item.key]}</b> {item.label}</LegendItem>)}
        {leaving ? <LegendItem color={leavingDot}>{leaving} leaving today</LegendItem> : null}
        {late ? <LegendItem color={lateDot}>{late} late to check out</LegendItem> : null}
      </ul>
    </div>
  );
}

function LegendItem({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: color }} />
      <span>{children}</span>
    </li>
  );
}

export function FloorBoard({ floors, organizationSlug, propertySlug }: { floors: FloorBoardFloor[]; organizationSlug: string; propertySlug: string }) {
  return (
    <div className="grid gap-6">
      {floors.map((floor) => (
        <section key={floor.label} className="grid gap-2">
          <h2 className="px-0.5 text-[13px] font-semibold text-muted-foreground">{floor.label}</h2>
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
            {floor.tiles.map((tile) => (
              <li key={tile.room.id}>
                {tile.stayId ? (
                  <Link
                    to="/hotel/$organizationSlug/$propertySlug/stays/$stayId"
                    params={{ organizationSlug, propertySlug, stayId: tile.stayId }}
                    className="block rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={tileLabel(tile)}
                  >
                    <Tile tile={tile} />
                  </Link>
                ) : (
                  <div aria-label={tileLabel(tile)} role="img">
                    <Tile tile={tile} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const looks = {
  occupied: "text-white",
  ready: "bg-success-tint text-success ring-[1.5px] ring-[#a7e3c0] ring-inset",
  cleaning: "bg-warning-tint text-warning",
  maintenance: "bg-[#f0f0f0] text-muted-foreground border-[1.5px] border-dashed border-[#d4d4d4]",
} as const;

function Tile({ tile }: { tile: FloorBoardTile }) {
  const flag = tile.overdue ? lateDot : tile.leavingToday ? leavingDot : null;
  return (
    <div
      aria-hidden
      className={cn("relative flex aspect-[1/1.05] flex-col justify-between overflow-hidden rounded-[14px] p-2.5 transition-opacity hover:opacity-90", looks[tile.kind])}
      style={tile.kind === "occupied" ? { background: keyGradient } : undefined}
    >
      {flag ? <span className="absolute top-2 right-2 size-2.5 rounded-full ring-2 ring-white/90" style={{ backgroundColor: flag }} /> : null}
      <span className="truncate text-[22px] leading-none font-extrabold tracking-[-0.6px] tabular-nums">{tile.room.number}</span>
      <span className={cn("truncate text-[11px] font-semibold", tile.kind === "occupied" && "font-medium text-white/80")}>{tile.caption}</span>
    </div>
  );
}

function tileLabel(tile: FloorBoardTile) {
  return `Room ${tile.room.number}, ${tile.caption}${tile.overdue ? ", checkout overdue" : tile.leavingToday ? ", leaving today" : ""}`;
}
