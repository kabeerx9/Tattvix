// Guests in house as a stack of room key cards, like cards in a phone wallet:
// each peeks out with its room and guest, the last one shows in full. On wider
// screens the stack fans out into a grid. A red "Late" or amber "Out today"
// badge marks who needs the desk. Mirrors apps/native/src/components/stay-wallet.tsx;
// order and lines come from getStayWallet in @tattvix/api.
import type { WalletCard } from "@tattvix/api";
import { cn } from "@tattvix/ui/lib/utils";
import { Link } from "@tanstack/react-router";

// Same values as native's keyCard tokens.
const keyGradient = "radial-gradient(120% 140% at 100% 0%, #8c1340 0%, #4a0d29 45%, #250716 100%)";

const badges = {
  late: { label: "Late", className: "bg-[#dc2626]" },
  today: { label: "Out today", className: "bg-[#d97706]" },
} as const;

export function StayWallet({ cards, organizationSlug, propertySlug }: { cards: WalletCard[]; organizationSlug: string; propertySlug: string }) {
  return (
    <ul className="grid md:grid-cols-2 md:gap-3 xl:grid-cols-3">
      {cards.map((card, index) => {
        const badge = card.badge ? badges[card.badge] : null;
        const room = card.stay.room?.number ?? "—";
        return (
          // Below md the cards overlap so each one peeks 58px out of the stack.
          <li key={card.stay.id} className={cn(index > 0 && "-mt-[70px] md:mt-0")}>
            <Link
              to="/hotel/$organizationSlug/$propertySlug/stays/$stayId"
              params={{ organizationSlug, propertySlug, stayId: card.stay.id }}
              aria-label={`Room ${room}, ${card.stay.guestName}, ${card.line}`}
              className="flex h-32 flex-col justify-between rounded-[20px] border border-white/15 px-4 pt-3.5 pb-4 text-white shadow-[0_-4px_12px_rgba(37,7,22,0.25)] outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] md:shadow-[0_8px_20px_rgba(74,13,41,0.22)] [print-color-adjust:exact]"
              style={{ background: keyGradient }}
            >
              <div className="flex items-center gap-3">
                <span className="text-[22px] leading-7 font-extrabold tracking-[-0.5px] tabular-nums">{room}</span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{card.stay.guestName}</span>
                {badge ? (
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", badge.className)}>{badge.label}</span>
                ) : (
                  <span className="shrink-0 text-sm text-white/75">{card.line}</span>
                )}
              </div>
              {badge ? <p className="truncate text-sm text-white/75">{card.line}</p> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
