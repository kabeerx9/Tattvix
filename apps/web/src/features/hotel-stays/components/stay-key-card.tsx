// The top of a stay: a room-key card in the brand's deep rose, with the stay's
// state as a solid pill and checkout as the loudest line. Mirrors
// apps/native/src/components/stay-key-card.tsx; text comes from getStayKeyCard
// in @tattvix/api. The gradient and status fills match native's `keyCard` tokens.
import type { StayKeyCard as StayKeyCardModel } from "@tattvix/api";
import { cn } from "@tattvix/ui/lib/utils";
import { AlarmClock, CircleCheck, Clock3, LogOut } from "lucide-react";

const statusLook = {
  success: { className: "bg-[#12924f]", Icon: CircleCheck },
  warning: { className: "bg-[#d97706]", Icon: Clock3 },
  danger: { className: "bg-[#dc2626]", Icon: AlarmClock },
  muted: { className: "bg-white/20", Icon: LogOut },
} as const;

export function StayKeyCard({
  card,
  roomNumber,
  roomDetail,
  guestName,
  initials,
  party,
  checkedIn,
}: {
  card: StayKeyCardModel;
  roomNumber: string | null;
  roomDetail: string | null;
  guestName: string;
  initials: string;
  /** "+ Rohan Sharma" or "1 guest". */
  party: string;
  /** "Checked in Tue 27 Oct, 3:12 pm". */
  checkedIn: string | null;
}) {
  const status = statusLook[card.status.tone];
  const { checkout } = card;
  return (
    <section
      className="relative w-full max-w-xl overflow-hidden rounded-[22px] p-5 text-white shadow-[0_16px_32px_rgba(74,13,41,0.28)] [print-color-adjust:exact]"
      style={{ background: "radial-gradient(120% 140% at 100% 0%, #8c1340 0%, #4a0d29 45%, #250716 100%)" }}
    >
      <span className={cn("inline-flex items-center gap-2 rounded-full py-2 pr-3.5 pl-3 text-[15px] font-bold", status.className)}>
        <status.Icon aria-hidden className="size-[17px]" strokeWidth={2.2} />
        {card.status.label}
      </span>

      {roomNumber ? (
        <>
          <p className="mt-4 text-[64px] leading-none font-extrabold tracking-[-2.5px] tabular-nums" aria-label={`Room ${roomNumber}`}>{roomNumber}</p>
          {roomDetail ? <p className="mt-1.5 text-sm text-white/70">{roomDetail}</p> : null}
        </>
      ) : (
        <p className="mt-4 text-3xl font-extrabold tracking-[-0.6px] text-white/75">No room yet</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-[13px] font-semibold">{initials}</span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{guestName}</p>
          <p className="truncate text-sm text-white/70">{party}</p>
        </div>
      </div>

      <div className={cn("mt-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-foreground", checkout.overdue && "bg-destructive-tint ring-2 ring-[#dc2626] ring-inset")}>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.5px] text-muted-foreground uppercase">{checkout.label}</p>
          <p className={cn("mt-0.5 truncate text-[22px] font-extrabold tracking-[-0.5px]", checkout.overdue && "text-destructive")}>{checkout.when}</p>
        </div>
        {checkout.countdown ? (
          <div className="ml-auto shrink-0 text-right">
            <p className="text-sm text-muted-foreground">{checkout.countdown.lead}</p>
            <p className={cn("text-[22px] font-extrabold tracking-[-0.5px] whitespace-nowrap", checkout.overdue && "text-destructive")}>{checkout.countdown.value}</p>
          </div>
        ) : null}
      </div>

      {checkedIn ? <p className="mt-3 text-sm text-white/70">{checkedIn}</p> : null}
    </section>
  );
}
