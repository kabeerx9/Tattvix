import * as React from "react"

export type IndicatorRect = {
  left: number
  width: number
  /** True when the indicator should jump instead of animating. */
  instant: boolean
}

/**
 * Measures the active item inside `containerRef` (the first element matching
 * `selector`) so a single indicator can move between items with a transform.
 * Re-measures when `activeKey` changes and when the container resizes.
 *
 * The first measurement and keyboard-driven changes come back `instant`:
 * motion is feedback for a pointer choice, and arrow-key navigation is a
 * high-frequency action that must not wait on an animation.
 */
export function useActiveIndicator(
  containerRef: React.RefObject<HTMLElement | null>,
  selector: string,
  activeKey: string | number | null | undefined
): IndicatorRect | null {
  const [rect, setRect] = React.useState<IndicatorRect | null>(null)
  const measured = React.useRef(false)
  const lastInput = React.useRef<"pointer" | "keyboard">("pointer")

  const measure = React.useCallback(
    (allowMotion: boolean) => {
      const container = containerRef.current
      const active = container?.querySelector<HTMLElement>(selector)
      if (!container || !active) {
        setRect(null)
        return
      }
      const box = container.getBoundingClientRect()
      const item = active.getBoundingClientRect()
      const left = item.left - box.left + container.scrollLeft - container.clientLeft
      const instant = !allowMotion || !measured.current || lastInput.current === "keyboard"
      measured.current = true
      setRect((previous) =>
        previous && previous.left === left && previous.width === item.width
          ? previous
          : { left, width: item.width, instant }
      )
    },
    [containerRef, selector]
  )

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onKeyDown = () => (lastInput.current = "keyboard")
    const onPointerDown = () => (lastInput.current = "pointer")
    container.addEventListener("keydown", onKeyDown)
    container.addEventListener("pointerdown", onPointerDown)
    return () => {
      container.removeEventListener("keydown", onKeyDown)
      container.removeEventListener("pointerdown", onPointerDown)
    }
  }, [containerRef])

  React.useLayoutEffect(() => {
    measure(true)
  }, [measure, activeKey])

  React.useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === "undefined") return
    // Layout changes (fonts loading, a resize) re-place the indicator without animating.
    const observer = new ResizeObserver(() => measure(false))
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef, measure])

  return rect
}
