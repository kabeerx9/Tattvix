// Bottom sheet on phones (drag handle, velocity-based swipe to dismiss,
// rubber-band when pulled up), centred dialog from 768px up.
import { cn } from "@tattvix/ui/lib/utils";
import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DISMISS_DISTANCE = 0.28; // fraction of sheet height
const DISMISS_VELOCITY = 0.45; // px per ms
const CLOSE_MS = 240;

function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<Element | null>(null);
  const drag = useRef<{ pointerId: number; startY: number; samples: { y: number; t: number }[] } | null>(null);
  const titleId = useId();

  // Mount -> next frame set data-open so the enter transition runs; on close
  // remove data-open, wait for the exit, then unmount.
  useEffect(() => {
    if (open) {
      restoreFocus.current = document.activeElement;
      setMounted(true);
      setClosing(false);
      const frame = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(frame);
    }
    if (!mounted) return;
    setVisible(false);
    setClosing(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
      if (sheet.current) sheet.current.style.transform = "";
      (restoreFocus.current as HTMLElement | null)?.focus?.();
    }, CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [mounted, onClose]);

  useEffect(() => {
    if (visible) sheet.current?.focus({ preventScroll: true });
  }, [visible]);

  const isDraggable = () => window.matchMedia("(max-width: 767px)").matches;

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (drag.current || !isDraggable() || !sheet.current) return; // ignore extra fingers
    if ((event.target as HTMLElement).closest("button")) return;
    // Capture on the handle itself so its move/up handlers keep firing.
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    sheet.current.setAttribute("data-dragging", "");
    drag.current = { pointerId: event.pointerId, startY: event.clientY, samples: [{ y: event.clientY, t: event.timeStamp }] };
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const state = drag.current;
    const node = sheet.current;
    if (!state || !node || event.pointerId !== state.pointerId) return;
    const raw = event.clientY - state.startY;
    const offset = raw < 0 ? -rubberband(-raw, node.offsetHeight) : raw;
    node.style.transform = `translate3d(0, ${offset}px, 0)`;
    state.samples.push({ y: event.clientY, t: event.timeStamp });
    if (state.samples.length > 5) state.samples.shift();
  }, []);

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      const state = drag.current;
      const node = sheet.current;
      if (!state || !node || event.pointerId !== state.pointerId) return;
      drag.current = null;
      node.removeAttribute("data-dragging");
      const distance = event.clientY - state.startY;
      const first = state.samples[0]!;
      const last = state.samples.at(-1)!;
      const velocity = (last.y - first.y) / Math.max(1, last.t - first.t);
      if (distance > node.offsetHeight * DISMISS_DISTANCE || (velocity > DISMISS_VELOCITY && distance > 12)) {
        node.style.transform = "translate3d(0, 100%, 0)";
        onClose();
      } else {
        node.style.transform = "";
      }
    },
    [onClose],
  );

  if (!mounted) return null;

  return createPortal(
    <div className="pd-root fixed inset-0 z-50 !min-h-0 bg-transparent">
      <div
        className="pd-backdrop absolute inset-0 bg-foreground/40"
        data-open={visible ? "" : undefined}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-open={visible ? "" : undefined}
        data-closing={closing ? "" : undefined}
        className={cn(
          "pd-sheet absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[24px] bg-background shadow-[var(--pd-shadow-raised)] outline-none",
          "md:inset-0 md:m-auto md:h-fit md:max-h-[86dvh] md:w-[min(560px,calc(100vw-48px))] md:rounded-[24px]",
        )}
      >
        <div
          className="pd-sheet-handle shrink-0"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="flex justify-center pt-2.5 pb-1 md:hidden">
            <span className="h-1.5 w-10 rounded-full bg-border" aria-hidden />
          </div>
          <div className="flex items-center gap-3 border-b border-border-soft px-5 pt-1 pb-3 md:px-6 md:pt-5 md:pb-4">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="pd-press -ml-2 grid size-9 place-items-center rounded-full hover:bg-muted"
            >
              <X className="size-[18px]" />
            </button>
            <h2 id={titleId} className="min-w-0 flex-1 truncate text-center text-base font-semibold">
              {title}
            </h2>
            <span className="size-9 shrink-0" aria-hidden />
          </div>
        </div>
        <div className="pd-sheet-body min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">{children}</div>
        {footer ? <div className="shrink-0 border-t border-border-soft px-5 py-3 md:px-6 md:py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
