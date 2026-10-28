// The guest's current stay as a hotel keycard they can turn over: the stay on
// the front (gold chip, room, check-in and checkout), the hotel on the back
// (address, times, who has opened their ID, a call link). Click it, or drag it
// sideways and let go: a spring carries it to the nearer face, and a flick
// turns it even from a short drag. Reduced motion cross-fades instead. Mirrors
// apps/native/src/components/guest-key-card.tsx; text comes from
// getGuestKeyCard in @tattvix/api. Colours match native's `guestCard` tokens.
import type { GuestKeyCard as GuestKeyCardModel } from "@tattvix/api";
import { cn } from "@tattvix/ui/lib/utils";
import { CircleCheck, Clock3, LogOut, MapPin, Phone, ShieldCheck, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const tealGradient = "linear-gradient(155deg, #13615f 0%, #0a3b3b 55%, #052222 100%)";

const statusLook = {
  success: { className: "bg-[#12924f]", Icon: CircleCheck },
  warning: { className: "bg-[#d97706]", Icon: Clock3 },
  muted: { className: "bg-white/20", Icon: LogOut },
} as const;

// Degrees of turn per pixel of drag: a full card width turns it about 200°.
const DEG_PER_PX = 0.6;
// The same feel as native's { duration: 500, dampingRatio: 0.8 } spring.
const STIFFNESS = 158;
const DAMPING = 20;

function backShowing(angle: number) {
  const turned = ((angle % 360) + 360) % 360;
  return turned > 90 && turned < 270;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function GuestKeyCard({ card }: { card: GuestKeyCardModel }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const motion = useRef({ angle: 0, velocity: 0, target: 0, frame: 0 });
  const drag = useRef<{ id: number; x: number; start: number; moved: boolean; samples: { t: number; a: number }[] } | null>(null);
  // A drag ends in pointerup and then a click; the click must not turn it again.
  const suppressClick = useRef(false);
  const [showBack, setShowBack] = useState(false);
  const [reduced] = useState(prefersReducedMotion);

  useEffect(() => () => cancelAnimationFrame(motion.current.frame), []);

  // Writes the transform straight to the element: no React render per frame.
  function paint() {
    const element = cardRef.current;
    if (!element || reduced) return;
    const { angle } = motion.current;
    const lift = Math.abs(Math.sin((angle * Math.PI) / 180));
    element.style.transform = `translateZ(${lift * 30}px) rotateY(${angle}deg)`;
  }

  function settleTo(target: number) {
    const state = motion.current;
    state.target = target;
    setShowBack(backShowing(target));
    cancelAnimationFrame(state.frame);
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      state.velocity += (-STIFFNESS * (state.angle - state.target) - DAMPING * state.velocity) * dt;
      state.angle += state.velocity * dt;
      if (Math.abs(state.angle - state.target) < 0.05 && Math.abs(state.velocity) < 0.5) {
        state.angle = state.target;
        state.velocity = 0;
        paint();
        return;
      }
      paint();
      state.frame = requestAnimationFrame(step);
    };
    state.frame = requestAnimationFrame(step);
  }

  function flip() {
    if (reduced) return setShowBack((value) => !value);
    settleTo(Math.round(motion.current.angle / 180) * 180 + 180);
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (drag.current || reduced) return; // ignore a second finger
    event.currentTarget.setPointerCapture(event.pointerId);
    cancelAnimationFrame(motion.current.frame);
    motion.current.velocity = 0;
    const angle = motion.current.angle;
    drag.current = { id: event.pointerId, x: event.clientX, start: angle, moved: false, samples: [{ t: event.timeStamp, a: angle }] };
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || event.pointerId !== current.id) return;
    const dx = event.clientX - current.x;
    if (Math.abs(dx) > 6) current.moved = true;
    if (!current.moved) return;
    motion.current.angle = current.start + dx * DEG_PER_PX;
    current.samples.push({ t: event.timeStamp, a: motion.current.angle });
    if (current.samples.length > 5) current.samples.shift();
    paint();
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || event.pointerId !== current.id) return;
    drag.current = null;
    // A tap is handled by onClick; a drag settles here and swallows the click.
    if (!current.moved) return settleTo(current.start);
    const first = current.samples[0];
    const last = current.samples[current.samples.length - 1];
    const velocity = last.t > first.t ? ((last.a - first.a) / (last.t - first.t)) * 1000 : 0;
    motion.current.velocity = velocity;
    // Where a flick would carry it, snapped to a face, at most one turn away.
    const projected = motion.current.angle + velocity * 0.12;
    const target = Math.min(current.start + 180, Math.max(current.start - 180, Math.round(projected / 180) * 180));
    settleTo(target);
    suppressClick.current = true;
  }

  function onClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    flip();
  }

  const status = statusLook[card.tone];
  const times = [card.checkOut ? `Check-out by ${card.checkOut}` : null, card.checkIn ? `check-in ${card.checkIn}` : null].filter(Boolean).join(" · ");
  const face = "absolute inset-0 flex flex-col overflow-hidden rounded-[20px] p-4 text-white shadow-[0_14px_28px_rgba(5,34,34,0.3)] [backface-visibility:hidden] [print-color-adjust:exact] sm:p-5";

  return (
    <div className="relative h-[240px] w-full max-w-md [perspective:1100px]">
      <div ref={cardRef} className="relative h-full [transform-style:preserve-3d]">
        <div
          aria-hidden={showBack}
          className={cn(face, reduced && "transition-opacity duration-200 ease-out", reduced && showBack && "opacity-0")}
          style={{ background: tealGradient }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xs font-semibold tracking-[0.5px] text-white/80 uppercase">{card.hotel}</p>
            <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full py-1 pr-2.5 pl-2 text-xs font-bold", status.className)}>
              <status.Icon aria-hidden className="size-3.5" strokeWidth={2.2} />
              {card.status}
            </span>
          </div>
          <span aria-hidden className="mt-3 block h-7 w-[38px] rounded-[7px] bg-[linear-gradient(135deg,#e9c98a,#b98d43)] p-1.5">
            <span className="block h-full rounded-[4px] border border-[rgba(80,50,10,0.45)]" />
          </span>
          <div className="mt-auto min-w-0">
            <p className="text-xs text-white/70">Room</p>
            <p className={cn("truncate text-[32px] leading-9 font-extrabold tracking-[-1px] tabular-nums", !card.room && "text-lg leading-6 tracking-[-0.2px] text-white/85")}>
              {card.room ?? "Reception is assigning it"}
            </p>
          </div>
          <div className="mt-2 flex justify-between gap-3 text-[13px] font-semibold">
            {card.since ? (
              <p className="min-w-0 truncate">
                <span className="block text-[11px] font-medium text-white/65">{card.since.label}</span>
                {card.since.when}
              </p>
            ) : (
              <span />
            )}
            {card.checkOut ? (
              <p className="shrink-0 text-right">
                <span className="block text-[11px] font-medium text-white/65">Check-out by</span>
                {card.checkOut}
              </p>
            ) : null}
          </div>
        </div>

        <div
          aria-hidden={!showBack}
          className={cn(face, "pt-0 sm:pt-0", reduced ? cn("transition-opacity duration-200 ease-out", !showBack && "opacity-0") : "[transform:rotateY(180deg)]")}
          style={{ background: tealGradient }}
        >
          <span aria-hidden className="-mx-4 mt-4 block h-[34px] shrink-0 bg-[#021414] sm:-mx-5" />
          <div className="mt-3 grid gap-2">
            <p className="truncate text-[15px] font-semibold">{card.hotel}</p>
            <Line Icon={MapPin} text={card.address ?? "The hotel hasn't added its address yet"} oneLine />
            {times ? <Line Icon={Clock3} text={times} /> : null}
            <Line Icon={ShieldCheck} text={card.idViews} />
          </div>
        </div>
      </div>

      {/* One transparent button turns the card; it sits under the call link so
          that link stays a separate, valid control. */}
      <button
        type="button"
        aria-label={`Your stay card at ${card.hotel}, showing the ${showBack ? "back" : "front"}. Turn it over.`}
        className="absolute inset-0 cursor-grab touch-pan-y rounded-[20px] outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:cursor-grabbing"
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {card.phone ? (
        // Fades in once the back has turned into view, and is unreachable while it hasn't.
        <a
          href={`tel:${card.phone}`}
          aria-hidden={!showBack}
          tabIndex={showBack ? undefined : -1}
          className={cn(
            "absolute right-4 bottom-4 left-4 flex items-center justify-center gap-2 rounded-xl bg-white/15 py-2.5 text-sm font-semibold text-white outline-none transition-opacity duration-200 ease-out hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white sm:right-5 sm:bottom-5 sm:left-5",
            showBack ? "opacity-100 delay-200" : "pointer-events-none opacity-0",
          )}
        >
          <Phone aria-hidden className="size-4" />
          Call reception
        </a>
      ) : null}
    </div>
  );
}

function Line({ Icon, text, oneLine = false }: { Icon: LucideIcon; text: string; oneLine?: boolean }) {
  return (
    <p className="flex items-start gap-2.5 text-[13px] leading-[18px]">
      <Icon aria-hidden className="mt-px size-[15px] shrink-0 text-white/80" strokeWidth={1.8} />
      <span className={oneLine ? "line-clamp-1" : "line-clamp-2"}>{text}</span>
    </p>
  );
}
