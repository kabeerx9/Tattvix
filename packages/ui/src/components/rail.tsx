import * as React from "react"

import { cn } from "@tattvix/ui/lib/utils"

/**
 * Horizontal card rail with scroll-snap; the next card peeks so it reads as
 * scrollable. Size cards with `auto-cols-[…]` on the rail. To turn it into a
 * grid from a breakpoint up, add e.g.
 * `md:grid-flow-row md:grid-cols-2 md:overflow-visible`.
 */
function Rail({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="rail" className={cn("scroll-rail", className)} {...props} />
}

export { Rail }
