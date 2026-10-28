// Colour marks for flat pages: a fact's icon on its solid colour, and a
// place's initials on its own gradient. Mirrors apps/native/src/design-system/Marks.tsx.
import type { FactTone, PlaceTone } from "@tattvix/api";
import { cn } from "@tattvix/ui/lib/utils";
import type { LucideIcon } from "lucide-react";

import { toneFills } from "@/components/fact-icons";

// Same stops as native's `placeGradients`; teal is the guest's own Personal place.
const placeGradients: Record<PlaceTone | "teal", string> = {
  teal: "linear-gradient(135deg, #13615f 0%, #0a3b3b 55%, #052222 100%)",
  plum: "linear-gradient(135deg, #8c1340 0%, #4a0d29 55%, #250716 100%)",
  midnight: "linear-gradient(135deg, #26365e 0%, #121a33 55%, #080c1a 100%)",
  emerald: "linear-gradient(135deg, #11704a 0%, #0a4430 55%, #04221a 100%)",
  graphite: "linear-gradient(135deg, #4a4a50 0%, #222226 60%, #111113 100%)",
};

/** A white icon on a solid colour square: colour without a pale tint of its own hue. */
export function SolidIcon({ icon: Icon, tone, className }: { icon: LucideIcon; tone: FactTone; className?: string }) {
  return (
    <span aria-hidden className={cn("grid size-8 shrink-0 place-items-center rounded-[9px] text-white", className)} style={{ backgroundColor: toneFills[tone] }}>
      <Icon className="size-[17px]" strokeWidth={2} />
    </span>
  );
}

/** A place's mark: its initials (or an icon) on the place's own gradient, the same in the switcher and on Privacy. */
export function PlaceMark({ tone, initials, icon: Icon, dim = false, className }: { tone: PlaceTone | "teal"; initials?: string; icon?: LucideIcon; dim?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("grid size-10 shrink-0 place-items-center rounded-[11px] text-[15px] font-bold tracking-[-0.3px] text-white [print-color-adjust:exact]", dim && "opacity-45", className)}
      style={{ background: placeGradients[tone] }}
    >
      {Icon ? <Icon className="size-[19px]" strokeWidth={1.9} /> : initials}
    </span>
  );
}
