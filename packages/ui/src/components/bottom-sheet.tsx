import * as React from "react"
import { createPortal } from "react-dom"
import { XIcon } from "lucide-react"

import { cn } from "@tattvix/ui/lib/utils"

const DISMISS_DISTANCE = 0.28 // fraction of the sheet's height
const DISMISS_VELOCITY = 0.45 // px per ms, measured over the last few moves
const CLOSE_MS = 240

/** Resistance that grows the further the sheet is pulled past its top. */
function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}

type DragState = {
  pointerId: number
  startY: number
  samples: { y: number; t: number }[]
}

/**
 * Bottom sheet on phones (drag handle, swipe down to dismiss on distance or
 * velocity, rubber-band when pulled up) and a centred dialog from 768px.
 * Escape and the backdrop close it; focus moves in on open and back to the
 * trigger on close; the page behind does not scroll.
 *
 * Styling lives in globals.css (`.bottom-sheet`, `.sheet-backdrop`).
 */
function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  const [mounted, setMounted] = React.useState(open)
  const [visible, setVisible] = React.useState(false)
  const [closing, setClosing] = React.useState(false)
  const sheetRef = React.useRef<HTMLDivElement>(null)
  const restoreFocus = React.useRef<HTMLElement | null>(null)
  const drag = React.useRef<DragState | null>(null)
  const titleId = React.useId()
  const descriptionId = React.useId()
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange])

  // Mount, then set data-open a frame later so the enter transition runs.
  // On close, drop data-open, wait for the exit, then unmount.
  const wasOpen = React.useRef(open)
  React.useEffect(() => {
    if (!open && !wasOpen.current) return
    wasOpen.current = open
    if (open) {
      restoreFocus.current = document.activeElement as HTMLElement | null
      setMounted(true)
      setClosing(false)
      const frame = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      )
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    setClosing(true)
    const timer = window.setTimeout(() => {
      setMounted(false)
      setClosing(false)
      restoreFocus.current?.focus?.()
    }, CLOSE_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  React.useEffect(() => {
    if (!mounted) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener("keydown", onKey)
    }
  }, [mounted, close])

  React.useEffect(() => {
    if (visible) sheetRef.current?.focus({ preventScroll: true })
  }, [visible])

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // One finger at a time; phones only; the close button stays a button.
    if (drag.current || !sheetRef.current) return
    if (!window.matchMedia("(max-width: 767px)").matches) return
    if ((event.target as HTMLElement).closest("button")) return
    event.currentTarget.setPointerCapture(event.pointerId)
    sheetRef.current.setAttribute("data-dragging", "")
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      samples: [{ y: event.clientY, t: event.timeStamp }],
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current
    const sheet = sheetRef.current
    if (!state || !sheet || event.pointerId !== state.pointerId) return
    const raw = event.clientY - state.startY
    const offset = raw < 0 ? -rubberband(-raw, sheet.offsetHeight) : raw
    sheet.style.transform = `translate3d(0, ${offset}px, 0)`
    state.samples.push({ y: event.clientY, t: event.timeStamp })
    if (state.samples.length > 5) state.samples.shift()
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current
    const sheet = sheetRef.current
    if (!state || !sheet || event.pointerId !== state.pointerId) return
    drag.current = null
    sheet.removeAttribute("data-dragging")
    const distance = event.clientY - state.startY
    const first = state.samples[0]!
    const last = state.samples[state.samples.length - 1]!
    const velocity = (last.y - first.y) / Math.max(1, last.t - first.t)
    if (
      distance > sheet.offsetHeight * DISMISS_DISTANCE ||
      (velocity > DISMISS_VELOCITY && distance > 12)
    ) {
      // Continue from the finger's position down and out; the node unmounts
      // after the exit, taking this inline style with it.
      sheet.style.transform = "translate3d(0, 100%, 0)"
      close()
    } else {
      // The CSS transition carries it back up.
      sheet.style.transform = ""
    }
  }

  if (!mounted || typeof document === "undefined") return null

  return createPortal(
    <div className="fixed inset-0 z-50" data-slot="bottom-sheet-root">
      <div
        aria-hidden
        className="sheet-backdrop absolute inset-0 bg-foreground/40"
        data-open={visible ? "" : undefined}
        onClick={close}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        data-slot="bottom-sheet"
        data-open={visible ? "" : undefined}
        data-closing={closing ? "" : undefined}
        className={cn(
          "bottom-sheet absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-3xl bg-background text-foreground shadow-raised outline-none",
          "md:inset-0 md:m-auto md:h-fit md:max-h-[86dvh] md:w-[min(560px,calc(100vw-48px))] md:rounded-3xl",
          className
        )}
      >
        <div
          className="shrink-0 touch-none md:touch-auto"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="flex cursor-grab justify-center pt-2.5 pb-1 md:hidden">
            <span className="h-1.5 w-10 rounded-full bg-border" aria-hidden />
          </div>
          <div className="flex items-center gap-3 border-b border-border-soft px-5 pt-1 pb-3 md:px-6 md:pt-5 md:pb-4">
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="press -ml-2 grid size-10 shrink-0 place-items-center rounded-full outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <XIcon className="size-[18px]" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <h2 id={titleId} className="truncate text-base font-semibold">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="truncate text-xs text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            <span className="size-10 shrink-0" aria-hidden />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 md:px-6">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-border-soft px-5 py-3 md:px-6 md:py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  )
}

export { BottomSheet }
