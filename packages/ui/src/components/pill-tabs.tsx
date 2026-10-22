import * as React from "react"

import { cn } from "@tattvix/ui/lib/utils"

type PillTabItem<T extends string> = {
  value: T
  label: string
  count?: number
}

/**
 * Rounded pill filters with optional counts ("Checking out (4)"). They
 * scroll sideways on a phone instead of wrapping. Arrow keys move between
 * pills (roving tabindex), as in a tablist.
 */
function PillTabs<T extends string>({
  value,
  onValueChange,
  items,
  label,
  className,
}: {
  value: T
  onValueChange: (value: T) => void
  items: PillTabItem<T>[]
  label: string
  className?: string
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const listRef = React.useRef<HTMLDivElement>(null)
  const activeIndex = items.findIndex((item) => item.value === value)

  // Keep the selected pill visible when the row scrolls sideways. Scroll the
  // row itself so the page never jumps vertically.
  React.useEffect(() => {
    const list = listRef.current
    const pill = refs.current[activeIndex]
    if (!list || !pill || list.scrollWidth <= list.clientWidth) return
    const left = pill.offsetLeft - list.offsetLeft
    const right = left + pill.offsetWidth
    if (left < list.scrollLeft || right > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: Math.max(0, left - 16) })
    }
  }, [activeIndex])

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = (index + step + items.length) % items.length
    refs.current[next]?.focus()
    onValueChange(items[next]!.value)
  }

  return (
    <div ref={listRef} role="tablist" aria-label={label} className={cn("scroll-pills py-0.5", className)}>
      {items.map((item, index) => {
        const isActive = item.value === value
        return (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[index] = node
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onValueChange(item.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "press h-10 shrink-0 rounded-full border px-4 text-sm whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "border-foreground font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--foreground)]"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span className="ml-1 tabular-nums">({item.count})</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export { PillTabs, type PillTabItem }
