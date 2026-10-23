// Room types & prices sheet, copied from production's portfolio-parts with
// the one change this revision is about: a missing photo shows a quiet text
// slot instead of an icon on a grey tile.
import type { PlatformPortfolioProperty } from "@tattvix/contracts";
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";

import { RoomStatusBar } from "@/features/platform-portfolio/components/portfolio-parts";
import { formatRateRange, roomTypeLabel } from "@/features/platform-portfolio/metrics";
import { formatMoneyWholeRupees } from "@/lib/money";

import { Photo } from "./common";

export function RoomTypesSheet({
  property,
  open,
  onOpenChange,
}: {
  property: PlatformPortfolioProperty;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Room types & prices" description={`${property.name} · ${property.rooms.total} rooms`}>
      <ul className="grid gap-4">
        {property.roomTypes.map((roomType) => (
          <li key={roomType.name} className="flex min-w-0 gap-4">
            <Photo url={roomType.photoUrl} className="size-20 shrink-0 rounded-xl" label="No photo" />
            <div className="grid min-w-0 flex-1 gap-1.5">
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <h3 className="min-w-0 truncate text-[15px] font-semibold">{roomTypeLabel(roomType.name)}</h3>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums">{formatRateRange(roomType.rates)}</span>
              </div>
              <p className="text-xs text-subtle-foreground tabular-nums">
                {roomType.rooms.total} {roomType.rooms.total === 1 ? "room" : "rooms"}
                {roomType.rates.avgMinor !== null ? ` · avg ${formatMoneyWholeRupees(roomType.rates.avgMinor)} a night` : ""}
              </p>
              <RoomStatusBar rooms={roomType.rooms} />
            </div>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
