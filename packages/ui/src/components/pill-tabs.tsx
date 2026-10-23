import * as React from "react"

import { useActiveIndicator } from "@tattvix/ui/hooks/use-active-indicator"
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
 *
 * The selected outline slides between pills: an aria-hidden copy of the row
 * is styled as selected and clipped to the active pill, and the clip moves
 * (docs/design-system.md "Motion"). Keyboard changes jump instead.
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
  const rowRef = React.useRef<HTMLDivElement>(null)
  const indicator = useActiveIndicator(rowRef, '[aria-selected="true"]', value)
  const activeIndex = items.findIndex((item) => item.value === value)

  // Keep the selected pill visible when the row scrolls sideways. Scroll the
  // row itself so the page never jumps vertically.
  React.useEffect(() => {
    const list = listRef.current
    const pill = refs.current[activeIndex]
    if (!list || !pill || list.scrollWidth <= list.clientWidth) return
    const left = pill.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft
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

  const pillClassName = (isActive: boolean) =>
    cn(
      "h-10 shrink-0 rounded-full border px-4 text-sm whitespace-nowrap",
      isActive && "font-semibold"
    )
  const content = (item: PillTabItem<T>) => (
    <>
      {item.label}
      {item.count !== undefined ? <span className="ml-1 tabular-nums">({item.count})</span> : null}
    </>
  )

  return (
    <div ref={listRef} role="tablist" aria-label={label} className={cn("scroll-pills py-0.5", className)}>
      <div ref={rowRef} className="relative flex shrink-0 gap-2">
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
                pillClassName(isActive),
                "press border-border text-muted-foreground outline-none hover:border-foreground/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              {content(item)}
            </button>
          )
        })}
        <div
          aria-hidden
          className="pill-tabs-active pointer-events-none absolute inset-0 flex gap-2"
          data-instant={!indicator || indicator.instant ? "" : undefined}
          style={{
            clipPath: indicator
              ? `inset(0 calc(100% - ${indicator.left + indicator.width}px) 0 ${indicator.left}px round 999px)`
              : "inset(0 100% 0 0)",
          }}
        >
          {items.map((item) => (
            <span
              key={item.value}
              className={cn(
                pillClassName(item.value === value),
                "inline-flex items-center border-foreground bg-background text-foreground shadow-[inset_0_0_0_1px_var(--foreground)]"
              )}
            >
              {content(item)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export { PillTabs, type PillTabItem }
