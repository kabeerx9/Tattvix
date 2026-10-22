// Phone-first chrome for the check-in steps: a sticky header with back and a
// segmented progress bar, one task per screen, and the primary action pinned
// in the thumb zone above the home indicator.

import { Button } from "@tattvix/ui/components/button";
import { Label } from "@tattvix/ui/components/label";
import { cn } from "@tattvix/ui/lib/utils";
import { ChevronLeft, Hotel } from "lucide-react";
import { useId } from "react";

import { checkInSteps, stepNumber, type CheckInStep } from "@/features/check-in/steps";

/** Brand bar for screens outside the numbered steps (welcome, stay status). */
export function CheckInBrandBar() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-xl items-center gap-2.5 px-4">
        <span className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground">
          <Hotel className="size-4" />
        </span>
        <p className="text-sm font-semibold">Tattwix</p>
        <p className="text-xs text-subtle-foreground">Secure hotel check-in</p>
      </div>
    </header>
  );
}

export function StepHeader({
  step,
  propertyName,
  onBack,
}: {
  step: CheckInStep;
  propertyName: string;
  onBack: () => void;
}) {
  const current = stepNumber(step);
  return (
    <header className="sticky top-0 z-20 border-b border-border-soft bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-xl items-center gap-1 px-2">
        <Button variant="ghost" size="icon-lg" className="size-11" aria-label="Back" onClick={onBack}>
          <ChevronLeft className="size-6" />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-xs text-subtle-foreground">{propertyName}</p>
          <p className="text-[13px] font-medium tabular-nums">
            Step {current} of {checkInSteps.length}
          </p>
        </div>
        <span className="size-11" aria-hidden />
      </div>
      <div
        className="mx-auto flex max-w-xl gap-1 px-4 pb-2.5"
        role="progressbar"
        aria-label="Check-in progress"
        aria-valuemin={1}
        aria-valuemax={checkInSteps.length}
        aria-valuenow={current}
      >
        {checkInSteps.map((item, index) => (
          <span key={item} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className={cn(
                "block h-full origin-left rounded-full bg-primary transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                index < current ? "scale-x-100" : "scale-x-0",
              )}
            />
          </span>
        ))}
      </div>
    </header>
  );
}

/** Title + one-line orienting copy at the top of a step. */
export function StepIntro({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <h1
        data-step-heading
        tabIndex={-1}
        className="text-2xl font-semibold tracking-[-0.02em] outline-none [overflow-wrap:anywhere]"
      >
        {title}
      </h1>
      {description ? (
        <p className="text-[15px] leading-6 text-muted-foreground [overflow-wrap:anywhere]">{description}</p>
      ) : null}
    </div>
  );
}

export function StepBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main
      className={cn(
        "mx-auto grid w-full max-w-xl flex-1 content-start gap-6 px-4 pt-5 pb-8 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4 motion-safe:duration-200",
        className,
      )}
    >
      {children}
    </main>
  );
}

/** The thumb-zone action bar. Sticks to the bottom, clears the home indicator. */
export function StepFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto grid max-w-xl gap-2.5 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}

/** Classes for the full-width, 48px primary action in the footer. */
export const footerButtonClassName = "h-12 w-full text-[15px] font-semibold";

export function FormField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => React.ReactNode;
}) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium text-foreground">
        {label}
        {required ? null : <span className="font-normal text-subtle-foreground">(optional)</span>}
      </Label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error || hint ? messageId : undefined,
      })}
      {error ? (
        <p id={messageId} className="text-[13px] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-[13px] text-subtle-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** A field's input height on phones: 48px targets with 16px text. */
export const stepInputClassName = "h-12 px-3.5 text-base";

export function ErrorNotice({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive-tint p-3 text-sm text-destructive">
      {children}
    </p>
  );
}
